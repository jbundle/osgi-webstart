/*
 * Copyright © 2011 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart;

import static java.util.jar.JarFile.MANIFEST_NAME;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;
import java.net.URL;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Dictionary;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.SimpleTimeZone;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;
import java.util.jar.Pack200;
import java.util.jar.Pack200.Packer;
import java.util.jar.Pack200.Unpacker;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import org.jbundle.util.osgi.ClassFinder;
import org.jbundle.util.osgi.ClassService;
import org.jbundle.util.osgi.finder.ClassFinderActivator;
import org.jbundle.util.osgi.finder.ClassServiceUtility;
import org.jbundle.util.webapp.base.BaseOsgiServlet;
import org.jibx.runtime.BindingDirectory;
import org.jibx.runtime.IBindingFactory;
import org.jibx.runtime.IMarshallingContext;
import org.jibx.runtime.IUnmarshallingContext;
import org.jibx.runtime.JiBXException;
import org.jibx.schema.net.java.jnlp_6_0.AppletDesc;
import org.jibx.schema.net.java.jnlp_6_0.ApplicationDesc;
import org.jibx.schema.net.java.jnlp_6_0.Argument;
import org.jibx.schema.net.java.jnlp_6_0.ComponentDesc;
import org.jibx.schema.net.java.jnlp_6_0.Description;
import org.jibx.schema.net.java.jnlp_6_0.Description.Kind;
import org.jibx.schema.net.java.jnlp_6_0.Desktop;
import org.jibx.schema.net.java.jnlp_6_0.Extension;
import org.jibx.schema.net.java.jnlp_6_0.Homepage;
import org.jibx.schema.net.java.jnlp_6_0.Icon;
import org.jibx.schema.net.java.jnlp_6_0.Information;
import org.jibx.schema.net.java.jnlp_6_0.Jar;
import org.jibx.schema.net.java.jnlp_6_0.Jar.Download;
import org.jibx.schema.net.java.jnlp_6_0.Jar.Main;
import org.jibx.schema.net.java.jnlp_6_0.Java;
import org.jibx.schema.net.java.jnlp_6_0.Jnlp;
import org.jibx.schema.net.java.jnlp_6_0.Menu;
import org.jibx.schema.net.java.jnlp_6_0.OfflineAllowed;
import org.jibx.schema.net.java.jnlp_6_0.Param;
import org.jibx.schema.net.java.jnlp_6_0.Property;
import org.jibx.schema.net.java.jnlp_6_0.Resources;
import org.jibx.schema.net.java.jnlp_6_0.Resources.Choice;
import org.jibx.schema.net.java.jnlp_6_0.Security;
import org.jibx.schema.net.java.jnlp_6_0.Shortcut;
import org.jibx.schema.net.java.jnlp_6_0.Shortcut.Online;
import org.jibx.schema.net.java.jnlp_6_0.Title;
import org.jibx.schema.net.java.jnlp_6_0.Vendor;
import org.jibx.schema.net.java.jnlp_6_0._Package;
import org.jibx.schema.net.java.jnlp_6_0._Package.Recursive;
import org.osgi.framework.Bundle;
import org.osgi.framework.BundleContext;
import org.osgi.framework.BundleEvent;
import org.osgi.framework.BundleListener;
import org.osgi.framework.Constants;

/**
 * OSGi to Jnlp translation Servlet.
 * Note: Is it not required that this inherits from JnlpDownloadServlet,
 * I was hoping to using some of the code, but most of the useful stuff is private.
 * I do call JnlpDownloadServlet methods if I don't know what to do with the call.
 * Note: This is designed to override the JnlpDownloadServlet. I just a little 
 * apprehensive about the licensing if I wrap the (sun) code in an OSGi wrapper. 
 * @author don
 *
 */
public class OsgiJnlpServlet extends BaseOsgiServlet /*JnlpDownloadServlet*/ {
	private static final long serialVersionUID = 1L;

    public static final String JNLP_MIME_TYPE = "application/x-java-jnlp-file";
    public static final String OUTPUT_ENCODING = "UTF-8";

    // Servlet params
    public static final String MAIN_CLASS = "mainClass";
    public static final String APPLET_CLASS = "appletClass";
    public static final String COMPONENT_CLASS = "componentClass";
    
    public static final String VERSION = "version";
    public static final String OTHER_PACKAGES = "otherPackages";
    public static final String TEMPLATE = "template";
    
    // Optional params
    public static final String TITLE = "title";
    public static final String VENDOR = "vendor";
    public static final String HOME_PAGE = "homePage";
    public static final String DESCRIPTION = "description";
    public static final String ICON = "icon";
    public static final String ONLINE = "online";
    public static final String DESKTOP = "shortcutDesktop";
    public static final String MENU = "shortcutMenu";
    public static final String JAVA_VERSION = "javaVersion";
    public static final String INITIAL_HEAP_SIZE = "initialHeapSize";
    public static final String MAX_HEAP_SIZE = "maxHeapSize";
    public static final String WIDTH = "width";
    public static final String HEIGHT = "height";
    public static final String INCLUDE = "include";
    public static final String EXCLUDE = "exclude";
    public static final String CODEBASE = "codebase";
    public static final String PROPERTIES_FILE = "webStartPropertiesFile";
    public static final String COMPONENTS = "webStartComponents";
    public static final String EXCLUDE_COMPONENTS = "excludeComponents";
    public static final String PROPERTIES = "webStartProperties";
    
    public static final String INCLUDE_DEFAULT = null;  // "org\\.jbundle\\..*|biz\\.source_code\\..*|com\\.tourapp\\..*";
    public static final String EXCLUDE_DEFAULT = "org\\.osgi\\..*|javax\\..*|org\\.xml\\.sax.*|org\\.w3c\\.dom.*|org\\.omg\\..*";

    Date lastBundleChange = null;

    enum Changes {
        UNKNOWN,
        NONE,
        PARTIAL,
        ALL,
    };

    /**
     * Constructor.
     * @param context
     */
    public OsgiJnlpServlet() {
    	super();
    }
    
    /**
     * Constructor.
     * @param context
     */
    public OsgiJnlpServlet(Object context, String servicePid, Dictionary<String, String> properties) {
    	this();
    	init(context, servicePid, properties);
    }
    
    /**
     * Constructor.
     * @param context
     */
    public void init(Object context, String servicePid, Dictionary<String, String> properties) {
    	super.init(context, servicePid, properties);
    	
    	listener = new BundleChangeListener(this);
    	this.getBundleContext().addBundleListener(listener);
    }
    
    BundleChangeListener listener = null;
    public class BundleChangeListener implements BundleListener
    {
        OsgiJnlpServlet servlet = null;
        public BundleChangeListener(OsgiJnlpServlet servlet)
        {
            this.servlet = servlet;
        }
        @Override
        public void bundleChanged(BundleEvent event) {
            if (event.getType() == BundleEvent.UPDATED)
                servlet.lastBundleChange = new Date();   // Probably a better way to do this
        }
    }    
    /**
     * Free my resources.
     */
    public void free()
    {
        if (getBundleContext() != null)
            if (listener != null)
                getBundleContext().removeBundleListener(listener);
        super.free();
    }
    /**
     * Main entry point for a web get request.
     */
    public void service(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
        boolean fileSent = false;
    	if (isJnlp(request))
    	    fileSent = makeJnlp(request, response);
    	else
    	    fileSent = sendDataFile(request, response);
    	if (!fileSent)
    	    super.service(request, response);
    }
    /**
     * Is this a url for jnlp?
     * @param request
     * @return
     */
    public boolean isJnlp(HttpServletRequest request)
    {
        if ((getRequestParam(request, MAIN_CLASS, null) != null)
                || (getRequestParam(request, APPLET_CLASS, null) != null)
                || (getRequestParam(request, COMPONENT_CLASS, null) != null)
                || (getRequestParam(request, PROPERTIES_FILE, null) != null))
            if (!request.getRequestURI().toUpperCase().endsWith(".HTML"))
                if (!request.getRequestURI().toUpperCase().endsWith(".HTM"))
                    return true;
        return false;
    }
    
    /**
     * Create the jnlp file give the main class name.
     * @param request
     * @param response
     * @throws ServletException
     * @throws IOException
     */
    public boolean makeJnlp(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException 
    {
        request = this.readIfPropertiesFile(request, getRequestParam(request, PROPERTIES_FILE, null), false);

		ServletContext context = getServletContext();
		response.setContentType(JNLP_MIME_TYPE);
		
	    try {
			IBindingFactory jc = BindingDirectory.getFactory(Jnlp.class);

			Jnlp jnlp = null;
			
			String template = getRequestParam(request, TEMPLATE, null);
			File jnlpFile = getJnlpFile(request);
			boolean forceScanBundle = !jnlpFile.exists();
			if (!forceScanBundle)
			    if (checkBundleChanges(request, response, jnlpFile))
			        return true;   // Returned the cached jnlp or a cache up-to-date response

			if (template == null)
                jnlp = new Jnlp();
            else
            {
                URL url = context.getResource(template);
                InputStream inStream = url.openStream();
                
                IUnmarshallingContext unmarshaller = jc.createUnmarshallingContext();
                jnlp = (Jnlp)unmarshaller.unmarshalDocument(inStream, OUTPUT_ENCODING);
            }
            
			Changes bundleChanged = setupJnlp(jnlp, request, response, forceScanBundle);
            if (bundleChanged == Changes.UNKNOWN)
            {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);   // Return a 'file not found' error
                return true;
            }
			if (!forceScanBundle)
			    if (bundleChanged == Changes.PARTIAL)
			        setupJnlp(jnlp, request, response, true);  // Need to rescan everything
            if (bundleChanged == Changes.NONE)
            {   // Note: It may seem better to listen for bundle changes, but actually webstart uses the cached jnlp file
                if (checkCacheAndSend(request, response, jnlpFile))
                {
                    Date lastModified = new Date(jnlpFile.lastModified());
                    if ((lastBundleChange != null)
                        && (lastBundleChange.after(lastModified)))
                            jnlpFile.setLastModified(lastBundleChange.getTime());   // Make sure this file is up-to-date for the next checkBundleChanges call
                    return true;   // Returned the cached jnlp or a cache up-to-date response
                }
            }
            // If bundleChanged == Changes.ALL need to return the new jnlp
			
            IMarshallingContext marshaller = jc.createMarshallingContext();
            marshaller.setIndent(4);

			Writer fileWriter = new FileWriter(jnlpFile);
            marshaller.marshalDocument(jnlp, OUTPUT_ENCODING, null, fileWriter);   // Cache jnlp
            fileWriter.close();
            Date lastModified = new Date(jnlpFile.lastModified());
            response.addHeader(LAST_MODIFIED, getHttpDate(lastModified));
            
            PrintWriter writer = response.getWriter();
            marshaller.marshalDocument(jnlp, OUTPUT_ENCODING, null, writer);
            lastBundleChange = lastModified;     // Use this cached file until bundles change
            return true;
		} catch (JiBXException e) {
			e.printStackTrace();
		}
	    return false;
	}
    /**
     * If there have not been any bundle changes, return the cached jnlp file.
     * @param request
     * @param response
     * @return
     * @throws IOException
     */
    public boolean checkBundleChanges(HttpServletRequest request, HttpServletResponse response, File file) throws IOException
    {
        Date lastModified = new Date(file.lastModified());
        if ((lastBundleChange == null)
            || (lastBundleChange.after(lastModified)))
                return false;
        return checkCacheAndSend(request, response, file);
    }
    /**
     * Return http response that the cache is up-to-date.
     * @param request
     * @param response
     * @return
     * @throws IOException
     */
    public boolean checkCacheAndSend(HttpServletRequest request, HttpServletResponse response, File file) throws IOException
    {
        String requestIfModifiedSince = request.getHeader(IF_MODIFIED_SINCE);
        Date lastModified = new Date(file.lastModified());
        try {
            if(requestIfModifiedSince!=null){
                Date requestDate = getDateFromHttpDate(requestIfModifiedSince);
                if (file != null)
                    if (!requestDate.before(lastModified))
                    {   // Not modified since last time
                        response.setHeader(LAST_MODIFIED, request.getHeader(IF_MODIFIED_SINCE));
                        response.sendError(HttpServletResponse.SC_NOT_MODIFIED);
                        return true;    // Success - use your cached copy
                    }
            }
        } catch (ParseException e) {
            // Fall through
        }
        // If they want it again, send them my cached copy
        if ((file == null) || (!file.exists()))
            return false;   // Error - cache doesn't exist
        response.addHeader(LAST_MODIFIED, getHttpDate(lastModified));
        
        InputStream inStream = new FileInputStream(file);
        OutputStream writer = response.getOutputStream();
        copyStream(inStream, writer, true); // Ignore errors, as browsers do weird things
        inStream.close();
        writer.close();
        return true;    // Success - I returned the cached copy
    }
    /**
     * Get the jnlp cache file name.
     * @param request
     * @return
     */
    protected File getJnlpFile(HttpServletRequest request)
    {
        StringBuilder sb = new StringBuilder();
        sb.append(getCodebase(request)).append(getHref(request)); // + '?' + request.getQueryString();
        String hash = Integer.toString(sb.toString().hashCode()).replace('-', 'a') + ".jnlp";
        return getBundleContext().getDataFile(hash);
    }
    /**
     * Populate the Jnlp xml.
     * @param jnlp
     * @param request
     * @param forceScanBundle Scan the bundle for package names even if the cache is current
     */
    protected Changes setupJnlp(Jnlp jnlp, HttpServletRequest request, HttpServletResponse response, boolean forceScanBundle)
    {
		String mainClass = getRequestParam(request, MAIN_CLASS, null);
		if (mainClass == null)
		    mainClass = getRequestParam(request, APPLET_CLASS, null);
        if (mainClass == null)
            mainClass = getRequestParam(request, COMPONENT_CLASS, null);
		String version = getRequestParam(request, VERSION, null);
		String packageName = ClassFinderActivator.getPackageName(mainClass, false);
		Bundle bundle = findBundle(packageName, version);
		if (bundle == null)
			return Changes.UNKNOWN;

        Set<Bundle> bundles = new HashSet<Bundle>();    // Inital empty Bundle list

        jnlp.setCodebase(getCodebase(request));
		jnlp.setHref(getHref(request));
		jnlp.setSpec("1.0+");
		
		setInformation(jnlp, bundle, request);
    	Security security = new Security();
    	jnlp.setSecurity(security);
				
		setJ2se(jnlp, bundle, request);
		
        String regexInclude = getRequestParam(request, INCLUDE, INCLUDE_DEFAULT);
        String regexExclude = getRequestParam(request, EXCLUDE, EXCLUDE_DEFAULT);
        String pathToJars = getPathToJars(request);

        Changes bundleChanged = Changes.UNKNOWN;
        bundleChanged = addProperties(request, response, jnlp, bundleChanged);

		Main main = getRequestParam(request, COMPONENT_CLASS, null) == null ? Main.TRUE : Main.FALSE;
		bundleChanged = addBundle(request, jnlp, bundle, main, forceScanBundle, bundleChanged, pathToJars);
		isNewBundle(bundle, bundles);	// Add only once
		
		Map<String, String> components = new LinkedHashMap<String, String>();
		bundleChanged = processComponents(request, response, jnlp, components, bundles, bundleChanged, pathToJars);

        bundleChanged = addDependentBundles(request, jnlp, getBundleProperty(bundle, Constants.IMPORT_PACKAGE), bundles, forceScanBundle, bundleChanged, regexInclude, regexExclude, pathToJars);
		
		if (getRequestParam(request, OTHER_PACKAGES, null) != null)
		    bundleChanged = addDependentBundles(request, jnlp, getRequestParam(request, OTHER_PACKAGES, null).toString(), bundles, forceScanBundle, bundleChanged, regexInclude, regexExclude, pathToJars);
        
        bundleChanged = addComponents(request, response, jnlp, components, bundles, bundleChanged, pathToJars);

        if (getRequestParam(request, MAIN_CLASS, null) != null)
			setApplicationDesc(jnlp, mainClass, request);
		else if (getRequestParam(request, APPLET_CLASS, null) != null)
			setAppletDesc(jnlp, mainClass, bundle, request);
        else
            setComponentDesc(jnlp, mainClass, request);
		return bundleChanged;
    }
    
    /**
     * Get the codebase from the request path.
     * @param request
     * @return
     */
    private String getCodebase(HttpServletRequest request)
    {
        String urlprefix = getUrlPrefix(request);
        String respath = request.getRequestURI();
        if (respath == null)
        	respath = "";
        String codebaseParam = getRequestParam(request, CODEBASE, null);
        int idx = respath.lastIndexOf('/');
        if (codebaseParam != null)
            if (respath.indexOf(codebaseParam) != -1)
                idx = respath.indexOf(codebaseParam) + codebaseParam.length() - 1;
        String codebase = respath.substring(0, idx + 1); // Include /
        codebase = urlprefix + request.getContextPath() + codebase;
        return codebase;
    }
    
    /**
     * Get the jnlp href from the request path.
     * @param request
     * @return
     */
    private String getHref(HttpServletRequest request)
    {
        String respath = request.getRequestURI();
        if (respath == null)
        	respath = "";
        String codebase = getRequestParam(request, CODEBASE, null);
        int idx = respath.lastIndexOf('/');
        if (codebase != null)
            if (respath.indexOf(codebase) != -1)
                idx = respath.indexOf(codebase) + codebase.length() - 1;
        String href = respath.substring(idx + 1);    // Exclude /
        href = href + '?' + request.getQueryString();
        return href;
    }
    /**
     * Get the path to the jar files (root of context path if codebase specified).
     * @param request
     * @return
     */
    private String getPathToJars(HttpServletRequest request)
    {
        String codebaseParam = getRequestParam(request, CODEBASE, null);
        if ((codebaseParam == null) || (codebaseParam.length() == 0))
                return "";
        String pathToJars = request.getRequestURI();
        String path = request.getPathInfo();
        if (pathToJars.endsWith(path))
            pathToJars = pathToJars.substring(0, pathToJars.length() - path.length() + 1);  // Keep the trailing '/'
        int idx = pathToJars.indexOf(codebaseParam);
        if (idx != -1)
            pathToJars = pathToJars.substring(idx + 1);
        return pathToJars;
    }
    /**
     *  This code is heavily inspired by the stuff in HttpUtils.getRequestURL
     */
    private String getUrlPrefix(HttpServletRequest request) {
        StringBuffer url = new StringBuffer();
        String scheme = request.getScheme();
        int port = request.getServerPort();
        url.append(scheme);		// http, https
        url.append("://");
        url.append(request.getServerName());
        if ((scheme.equals("http") && port != 80)
	    || (scheme.equals("https") && port != 443)) {
            url.append(':');
            url.append(request.getServerPort());
        }
        return url.toString();
    }

    /**
     * Set up the jnlp information fields.
     * @param jnlp
     */
    public void setInformation(Jnlp jnlp, Bundle bundle, HttpServletRequest request)
	{
    	if (jnlp.getInformationList() == null)
    		jnlp.setInformationList(new ArrayList<Information>());
    	List<Information> informationList = jnlp.getInformationList();
    	if (informationList.size() == 0)
    		informationList.add(new Information());
    	Information information = informationList.get(0);
    	
    	Title title = new Title();
    	if (getRequestParam(request, TITLE, null) != null)
    		title.setTitle(getRequestParam(request, TITLE, null));
    	else if (getBundleProperty(bundle, Constants.BUNDLE_NAME) != null)
    		title.setTitle(getBundleProperty(bundle, Constants.BUNDLE_NAME));
    	else if (getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME) != null)
    		title.setTitle(getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME));
    	else
    		title.setTitle("Jnlp Application");
    	information.setTitle(title);
    	
    	Vendor vendor = new Vendor();
    	if (getRequestParam(request, VENDOR, null) != null)
        	vendor.setVendor(getRequestParam(request, VENDOR, null));
    	else if (getBundleProperty(bundle, Constants.BUNDLE_VENDOR) != null)
    		vendor.setVendor(getBundleProperty(bundle, Constants.BUNDLE_VENDOR));
    	else
    		vendor.setVendor("jbundle.org");
    	information.setVendor(vendor);
    	
    	Homepage homepage = new Homepage();
    	if (getRequestParam(request, HOME_PAGE, null) != null)
    		homepage.setHref(getRequestParam(request, HOME_PAGE, null));
    	else if (getBundleProperty(bundle, Constants.BUNDLE_DOCURL) != null)
    		homepage.setHref(getBundleProperty(bundle, Constants.BUNDLE_DOCURL));
    	else
    		homepage.setHref("http://www.jbundle.org");
    	information.setHomepage(homepage);
    	
    	if (information.getDescriptionList() == null)
    		information.setDescriptionList(new ArrayList<Description>());
    	if (information.getDescriptionList().size() == 0)
    	{
	    	Description description = new Description();
	    	description.setKind(Kind.ONELINE);
	    	if (getRequestParam(request, DESCRIPTION, null) != null)
	    		description.setString(getRequestParam(request, DESCRIPTION, null));
	    	else if (getBundleProperty(bundle, Constants.BUNDLE_DESCRIPTION) != null)
	    		description.setString(getBundleProperty(bundle, Constants.BUNDLE_DESCRIPTION));
	    	else
	    		description.setString("Jnlp Application");
	    	information.getDescriptionList().add(description);
    	}
    	
    	if (information.getIconList() == null)
    		information.setIconList(new ArrayList<Icon>());
    	if (information.getIconList().size() == 0)
    	{
	    	Icon icon = new Icon();
	    	icon.setHref(getRequestParam(request, ICON, getPathToJars(request) + "images/icons/jbundle32.jpg"));
	    	information.getIconList().add(icon);
    	}
    	
    	OfflineAllowed offlineAllowed = new OfflineAllowed();
    	information.setOfflineAllowed(offlineAllowed);
    	
    	Shortcut shortcut = new Shortcut();
    	if (Boolean.TRUE.toString().equalsIgnoreCase(getRequestParam(request, ONLINE, null)))
    		shortcut.setOnline(Online.TRUE);
    	else
    		shortcut.setOnline(Online.FALSE);	// Default
    	information.setShortcut(shortcut);
    	if (Boolean.TRUE.toString().equalsIgnoreCase(getRequestParam(request, DESKTOP, null)))
    	{
    		Desktop desktop = new Desktop();
    		shortcut.setDesktop(desktop);
    	}
    	String menuItem = getRequestParam(request, MENU, null);
    	if (menuItem != null)
    	{
	    	Menu menu = new Menu();
	    	menu.setSubmenu(menuItem);
	    	shortcut.setMenu(menu);
    	}
	}
    
    /**
     * Add the j2se lines.
     * @param jnlp
     */
    public void setJ2se(Jnlp jnlp, Bundle bundle, HttpServletRequest request)
	{
		Choice choice = getResource(jnlp, true);	// Clear the entries and create a new one
		Java java = new Java();
		choice.setJava(java);
		java.setVersion(getRequestParam(request, JAVA_VERSION, "1.6+"));
		if (getRequestParam(request, INITIAL_HEAP_SIZE, null) != null)
		    java.setInitialHeapSize(getRequestParam(request, INITIAL_HEAP_SIZE, null));
        if (getRequestParam(request, MAX_HEAP_SIZE, null) != null)
            java.setMaxHeapSize(getRequestParam(request, MAX_HEAP_SIZE, null));
	}
    
    /**
     * Call the osgi utility to find the bundle for this package and version.
     * @param packageName
     * @param versionRange
     * @return
     */
	public Bundle findBundle(String packageName, String versionRange)
	{
		ClassService classService = ClassServiceUtility.getClassService();
		if (classService == null)
			return null;	// Never
		ClassFinder classFinder = classService.getClassFinder(getBundleContext());
		if (classFinder == null)
			return null;
		Bundle bundle = (Bundle)classFinder.findBundle(null, getBundleContext(), packageName, versionRange);
		if (bundle == null)
		{
	        Object resource = classFinder.deployThisResource(packageName, versionRange, false);    // Deploy, but do not start the bundle
	        if (resource != null)
	        	bundle = (Bundle)classFinder.findBundle(resource, getBundleContext(), packageName, versionRange);
		}
		return bundle;
	}
	
	/**
	 * Has the bundle been added yet?
	 * @param bundle
	 * @param bundles
	 * @return true If this bundle is not in the cache.
	 */
	public boolean isNewBundle(Bundle bundle, Set<Bundle> bundles)
	{
		if (bundle == null)
			return false;
		return bundles.add(bundle);
	}
	
	/**
	 * Add this bundle to the jnlp jar and package information.
	 * @param jnlp
	 * @param bundle
	 * @param main
	 * @param forceScanBundle Scan the bundle for package names even if the cache is current
	 * @return true if the bundle has changed from last time
	 */
	public Changes addBundle(HttpServletRequest request, Jnlp jnlp, Bundle bundle, Main main, boolean forceScanBundle, Changes bundleChanged, String pathToJars)
	{
		String name = getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME);
		String version = getBundleProperty(bundle, Constants.BUNDLE_VERSION);
		String activationPolicy = getBundleProperty(bundle, Constants.BUNDLE_ACTIVATIONPOLICY);
        if ((activationPolicy == null) || (activationPolicy.length() == 0))
            activationPolicy = this.getRequestParam(request, name + '.' + Constants.BUNDLE_ACTIVATIONPOLICY, null);
		if ((activationPolicy == null) || (activationPolicy.length() == 0))
		    activationPolicy = this.getRequestParam(request, Constants.BUNDLE_ACTIVATIONPOLICY, null);
        if ((activationPolicy == null) || (activationPolicy.length() == 0))
            activationPolicy = this.getProperty(Constants.BUNDLE_ACTIVATIONPOLICY);
		Download download = Constants.ACTIVATION_LAZY.equalsIgnoreCase(activationPolicy) ? Download.LAZY : Download.EAGER;
		String filename = name + '-' + version + ".jar";
		boolean pack = !"false".equalsIgnoreCase(this.getProperty("jnlp.packEnabled"));   // Pack by default
		String[] packages = moveBundleToJar(bundle, filename, forceScanBundle, pack);
		if (packages == null) // No changes on this bundle
	        return (bundleChanged == Changes.NONE || bundleChanged == Changes.UNKNOWN) ? Changes.NONE : Changes.PARTIAL;
		if (main == null)
			main = Main.FALSE;
		if (pathToJars != null)
		    filename = pathToJars + filename;
		Jar jar = addJar(jnlp, filename, name, main, download);
		for (String packageName : packages)
		{
			addPackage(jnlp, jar, packageName, Recursive.FALSE);
		}
        return (bundleChanged == Changes.ALL || bundleChanged == Changes.UNKNOWN) ? Changes.ALL : Changes.PARTIAL;
	}
	
	/**
	 * Add all the dependent bundles (of this bundle) to the jar and package list.
	 * @param jnlp
	 * @param bundle
	 * @param bundles
	 * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @return true if the bundle has changed from last time
	 */
	public Changes addDependentBundles(HttpServletRequest request, Jnlp jnlp, String importPackage, Set<Bundle> bundles, boolean forceScanBundle, Changes bundleChanged, String regexInclude, String regexExclude, String pathToJars)
	{
		String[] packages = parseHeader(importPackage, regexInclude, regexExclude);
		for (String packageName : packages)
		{
		    if (packageName.length() == 0)
		        continue;
			String properties[] = parseImport(packageName);
			String version = getVersion(properties);
			packageName = properties[0];
			Bundle subBundle = findBundle(packageName, version);
			if (isNewBundle(subBundle, bundles))
			{
				bundleChanged = addBundle(request, jnlp, subBundle, Main.FALSE, forceScanBundle, bundleChanged, pathToJars);
				bundleChanged = addDependentBundles(request, jnlp, getBundleProperty(subBundle, Constants.IMPORT_PACKAGE), bundles, forceScanBundle, bundleChanged, regexInclude, regexExclude, pathToJars);	// Recursive
			}
		}
		return bundleChanged;
	}
	
	/**
	 * Get this bundle header property.
	 * @param bundle
	 * @param property
	 * @return
	 */
	public static String getBundleProperty(Bundle bundle, String property)
	{
		return (String)bundle.getHeaders().get(property);
	}
	public static final String MANIFEST_DIR = "META-INF/";
	public static final String MANIFEST_PATH = MANIFEST_DIR + "MANIFEST.MF";
    public static int ONE_SEC_IN_MS = 1000;
	
	/**
	 * Create a jar for this bundle and move all the classes to the new jar.
	 * Note: I followed the same logic as in the java jar tool.
	 * @param bundle
	 * @param filename
	 * @param forceScanBundle Scan the bundle for package names even if the cache is current
	 * @param pack Also do a pack gzip on the jar.
	 * @return All the package names in the bundle or null if I am using the cached jar.
	 */
	public String[] moveBundleToJar(Bundle bundle, String filename, boolean forceScanBundle, boolean pack)
	{
        File fileOut = getBundleContext().getDataFile(filename);
        boolean createNewJar = true;
        if (fileOut.exists())
            if (bundle.getLastModified() <= (fileOut.lastModified() + ONE_SEC_IN_MS))   // File sys is usually accurate to sec 
            {
                createNewJar = false;
                if (!forceScanBundle)
                    return null;    // Use cached jar file
            }
        
        Set<String> packages = new HashSet<String>();
		try {
			Manifest manifest = null;
			String path = MANIFEST_PATH;
			URL url = bundle.getEntry(path);
			JarOutputStream zos = null;
			if (createNewJar)
			{
    			InputStream in = null;
    			if (url != null)
    			{
    				try {
    					in = url.openStream();
    				} catch (Exception e) {
    					e.printStackTrace();
    				}
    			}
    			if (in != null)
    			{
                    manifest = new Manifest(new BufferedInputStream(in));
                } else {
                    manifest = new Manifest();
                }
    			
    			FileOutputStream out = new FileOutputStream(fileOut);
    			
    	        zos = new JarOutputStream(out);
    	        if (manifest != null) {
    	            JarEntry e = new JarEntry(MANIFEST_DIR);
    	            e.setTime(System.currentTimeMillis());
    	            e.setSize(0);
    	            e.setCrc(0);
    	            zos.putNextEntry(e);
    	            e = new JarEntry(MANIFEST_NAME);
    	            e.setTime(System.currentTimeMillis());
    	            zos.putNextEntry(e);
    	            manifest.write(zos);
    	            zos.closeEntry();
    	        }
			}
			String paths = "/";
			String filePattern = "*";
			@SuppressWarnings("unchecked")
			Enumeration<URL> entries = bundle.findEntries(paths, filePattern, true);
			while (entries.hasMoreElements())
			{
				url = entries.nextElement();
				String name = url.getPath();
				if (name.startsWith("/"))
					name = name.substring(1);
    		    name = entryName(name);
    	        if (name.equals("") || name.equals("."))
    	            continue;
    	        if ((name.equalsIgnoreCase(MANIFEST_DIR)) || (name.equalsIgnoreCase(MANIFEST_PATH)))
            		continue;
                boolean isDir = name.endsWith("/");
    	        if (createNewJar)
    	        {
        	        long size = isDir ? 0 : -1; // ***????****  file.length();
        	        JarEntry e = new JarEntry(name);
        	        e.setTime(fileOut.lastModified()); //???
        	        if (size == 0) {
        	            e.setMethod(JarEntry.STORED);
        	            e.setSize(0);
        	            e.setCrc(0);
        	        }
        	        zos.putNextEntry(e);
        	        if (!isDir) {
        		        InputStream inStream = url.openStream();
        		        copyStream(inStream, zos, false);
        	            inStream.close();
        	        }
        	        zos.closeEntry();
    	        }
    	        
    	        if (!isDir)
    	            if (!(name.toUpperCase().startsWith(MANIFEST_DIR)))
    	        		packages.add(getPackageFromName(name));
			}
			if (zos != null)
			    zos.close();
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		
        if ((createNewJar) && (pack))
		    this.packJar(fileOut.getPath(), false);   // I use that original jar for debugging
		
		return packages.toArray(EMPTY_ARRAY);
	}
	/**
	 * Pack and gzip this jar file.
	 * Note: Most of this code comes from the oracle (thanks!) sample at:
	 * http://docs.oracle.com/javase/1.5.0/docs/api/java/util/jar/Pack200.html
	 * Note: I pack and then unpack to recreate the original jar since pack messes up the magic number.
	 * @param jarFileName
	 */
	public void packJar(String jarFileName, boolean modifyOriginalJar)
	{
	    String packFileName = jarFileName + ".pack";
	    Packer packer = Pack200.newPacker();

	    // Initialize the state by setting the desired properties
	    Map<String,String> p = packer.properties();
	    // take more time choosing codings for better compression
	    p.put(Packer.EFFORT, "7");  // default is "5"
	    // use largest-possible archive segments (>10% better compression).
	    p.put(Packer.SEGMENT_LIMIT, "-1");
	    // reorder files for better compression.
	    p.put(Packer.KEEP_FILE_ORDER, Packer.FALSE);
	    // smear modification times to a single value.
	    p.put(Packer.MODIFICATION_TIME, Packer.LATEST);
	    // ignore all JAR deflation requests,
	    // transmitting a single request to use "store" mode.
	    p.put(Packer.DEFLATE_HINT, Packer.FALSE);
	    // discard debug attributes
	    p.put(Packer.CODE_ATTRIBUTE_PFX+"LineNumberTable", Packer.STRIP);
	    // throw an error if an attribute is unrecognized
	    p.put(Packer.UNKNOWN_ATTRIBUTE, Packer.ERROR);
	    // pass one class file uncompressed:
	    p.put(Packer.PASS_FILE_PFX+0, "mutants/Rogue.class");
	    try {
	        JarFile jarFile = new JarFile(jarFileName);
	        FileOutputStream fos = new FileOutputStream(packFileName);
	        // Call the packer
	        packer.pack(jarFile, fos);
	        jarFile.close();
	        fos.close();
	        
	        File f = new File(packFileName);
	        String reJaredFileName = jarFileName;
	        if (!modifyOriginalJar)
	            reJaredFileName = reJaredFileName + ".temp";
	        FileOutputStream fostream = new FileOutputStream(reJaredFileName);
	        JarOutputStream jostream = new JarOutputStream(fostream);
	        Unpacker unpacker = Pack200.newUnpacker();
	        // Call the unpacker
	        unpacker.unpack(f, jostream);
	        // Must explicitly close the output.
	        jostream.close();
	        // Need to repack it so the new magic number will be correct
            jarFile = new JarFile(reJaredFileName);
            fos = new FileOutputStream(packFileName);
            // Call the packer
            packer.pack(jarFile, fos);
            jarFile.close();
            fos.close();	        
            if (!modifyOriginalJar)
            {
                File reJaredFile = new File(reJaredFileName);
                reJaredFile.delete();   // Delete the temp jar file
            }
	    } catch (IOException ioe) {
	        ioe.printStackTrace();
	    }
	    
	    this.gzipFile(packFileName);
	    // Delete the pack file
        File packFile = new File(packFileName);
        packFile.delete();
	}
	/**
	 * GZip this pack file.
	 * @param pathName
	 */
	public void gzipFile(String pathName)
	{
	    try {
            InputStream inStream = new FileInputStream(pathName);
            // serialize the pack file
            FileOutputStream fos = new  FileOutputStream(pathName + ".gz");
            GZIPOutputStream outStream = new GZIPOutputStream(fos);
            
            copyStream(inStream, outStream, false);
            
            inStream.close();
            outStream.close();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
	}
	/**
	 * Unpack bundle files and add them to the destination directory.
	 * @param bundle
	 * @param rootPathInJar
	 * @param destDir
	 */
	public static void transferBundleFiles(Bundle bundle, String rootPathInJar, String destDir)
	{
		if ((!destDir.endsWith("/")) && (!destDir.endsWith(File.separator)))
			destDir = destDir + File.separator;
	    Enumeration<?> paths = bundle.findEntries(rootPathInJar, "*", true);
	    if (paths != null)
	    {
	    	while (paths.hasMoreElements())
	    	{
				URL url = (URL)paths.nextElement();
				String fileName = url.getFile();
				if ((!fileName.endsWith("/")) && (!fileName.endsWith(File.separator)))
				{
					int startLocalPath = fileName.indexOf(rootPathInJar) + rootPathInJar.length();
					if (startLocalPath > 0)
					{	// Always
						fileName = fileName.substring(startLocalPath);
						if ((fileName.startsWith("/")) || (fileName.startsWith(File.separator)))
							fileName = fileName.substring(1);
						fileName = destDir + fileName;
	                	File file = new File(fileName);
	                	file = file.getParentFile();
	                	if (!file.exists())
	                		file.mkdirs();
						try {
							FileOutputStream outStream = new FileOutputStream(fileName);
							copyStream(url.openStream(), outStream, false);
						} catch (FileNotFoundException e) {
							e.printStackTrace();
						} catch (IOException e) {
							e.printStackTrace();
						}
					}
				}
	    	}
	    }
	}

	/**
	 * Very similar to the code in jar tool.
	 * @param name
	 * @return
	 */
    private String entryName(String name) {
        name = name.replace(File.separatorChar, '/');
        String matchPath = "";
        /* Need to add code to consolidate paths
        for (String path : paths) {
            if (name.startsWith(path)
                && (path.length() > matchPath.length())) {
                matchPath = path;
            }
        }
        */
        name = name.substring(matchPath.length());

        if (name.startsWith("/")) {
            name = name.substring(1);
        } else if (name.startsWith("./")) {
            name = name.substring(2);
        }
        return name;
    }
	public static final String[] EMPTY_ARRAY = new String[0];
	
	/**
	 * Add jar information to jnlp.
	 * @param jnlp
	 * @param href
	 * @param part
	 * @param main
	 * @param download
	 * @return
	 */
    public Jar addJar(Jnlp jnlp, String href, String part, Main main, Download download)
    {
    	if (main == null)
    		main = Main.FALSE;
    	if (download == null)
    		download = Download.LAZY;
		Choice choice = getResource(jnlp, false);
		Jar jar = new Jar();
		choice.setJar(jar);
		jar.setHref(href);
		jar.setPart(part);
		jar.setDownload(download);
		jar.setMain(main);
		return jar;
    }
    
    /**
     * Add package jnlp entry.
     * @param jnlp
     * @param jar
     * @param packagePath
     * @param recursive
     * @return
     */
    public _Package addPackage(Jnlp jnlp, Jar jar, String packagePath, Recursive recursive)
    {
		Choice choice = getResource(jnlp, false);
		_Package pack = new _Package();
		choice.setPackage(pack);
		pack.setPart(jar.getPart());
		pack.setName(packagePath);
		if (recursive == null)
			recursive = Recursive.FALSE;
		pack.setRecursive(recursive);
		return pack;
    }
    
    /**
     * Set jnlp application description.
     * @param jnlp
     * @param mainClass
     */
    public void setApplicationDesc(Jnlp jnlp, String mainClass, HttpServletRequest request)
    {
    	if (jnlp.getApplicationDesc() == null)
    		jnlp.setApplicationDesc(new ApplicationDesc());
    	ApplicationDesc applicationDesc = jnlp.getApplicationDesc();
    	applicationDesc.setMainClass(mainClass);
    	
    	List<Argument> arguments = applicationDesc.getArgumentList();
    	if (arguments == null)
    	    applicationDesc.setArgumentList(arguments = new ArrayList<Argument>());
    	@SuppressWarnings("unchecked")
        Enumeration<String> keys = request.getParameterNames();
    	while (keys.hasMoreElements())
    	{
    	    String key = keys.nextElement();
            if (isServletParam(key))
                continue;
    	    String value = request.getParameter(key);
    	    if (value != null)
    	        key = key + "=" + value;
        	Argument argument = new Argument();
        	argument.setArgument(key);
        	arguments.add(argument);
    	}
    }
    
    /**
     * Set jnlp applet description.
     * @param jnlp
     * @param mainClass
     */
    public void setAppletDesc(Jnlp jnlp, String mainClass, Bundle bundle, HttpServletRequest request)
    {
        String appletName = null;
        if (getRequestParam(request, TITLE, null) != null)
            appletName = getRequestParam(request, TITLE, null);
        else if (getBundleProperty(bundle, Constants.BUNDLE_NAME) != null)
            appletName = getBundleProperty(bundle, Constants.BUNDLE_NAME);
        else if (getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME) != null)
            appletName = getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME);
        else
            appletName = "Jnlp Application";
    	if (jnlp.getAppletDesc() == null)
    		jnlp.setAppletDesc(new AppletDesc());
    	AppletDesc appletDesc = jnlp.getAppletDesc();
    	appletDesc.setMainClass(mainClass);
    	appletDesc.setName(appletName);
    	appletDesc.setWidth(getRequestParam(request, WIDTH, "350"));
    	appletDesc.setHeight(getRequestParam(request, HEIGHT, "600"));
        
        List<Param> params = appletDesc.getParamList();
        if (params == null)
            appletDesc.setParamList(params = new ArrayList<Param>());
        @SuppressWarnings("unchecked")
        Enumeration<String> keys = request.getParameterNames();
        while (keys.hasMoreElements())
        {
            String key = keys.nextElement();
            if (isServletParam(key))
                continue;
            String value = request.getParameter(key);
            Param argument = new Param();
            argument.setName(key);
            if (value != null)
                argument.setValue(value);
            params.add(argument);
        }
    }

    /**
     * Set jnlp component xml (empty) element.
     * @param jnlp
     * @param mainClass
     */
    public void setComponentDesc(Jnlp jnlp, String mainClass, HttpServletRequest request)
    {
        if (jnlp.getComponentDesc() == null)
            jnlp.setComponentDesc(new ComponentDesc());
    }

    /**
     * Is this a servlet param (that I should not pass to the applications)?
     * @param name
     * @return
     */
    private boolean isServletParam(String name)
    {
        if (name == null)
            return false;
        if (name.startsWith(getPackageFromName(OsgiJnlpServlet.class.getName())))
            return true;
        return false;
    }
    
    /**
     * Create a new resource entry.
     * @param jnlp
     * @return
     */
    protected Choice getResource(Jnlp jnlp, boolean firstTime)
    {
		if (jnlp.getResourceList() == null)
			jnlp.setResourceList(new ArrayList<Resources>());
		List<Resources> resourcesList = jnlp.getResourceList();
		if (resourcesList.size() == 0)
			resourcesList.add(new Resources());
		Resources resources = resourcesList.get(0);
		List<Choice> choiceList = resources.getChoiceList();
		
		if (firstTime)
		for (int i = choiceList.size() - 1; i >= 0; i--)
		{
			choiceList.remove(i);
		}
		
		Choice choice = new Choice();
		choiceList.add(choice);
		return choice;    	
    }

    /**
     * Jnlp is asking for the jar file that I just created, return it.
     * @param request
     * @param response
     * @return
     * @throws IOException
     */
    public boolean sendDataFile(HttpServletRequest request, HttpServletResponse response) throws IOException
    {
    	String path = request.getPathInfo();
    	if (path == null)
    		return false;
    	path = path.substring(path.lastIndexOf("/") + 1);  // Jars are placed at the root of the cache directory

    	File file = getBundleContext().getDataFile(path);
    	if ((file == null) || (!file.exists()))
    	{  // Don't return a 404, try to read the file using JnlpDownloadServlet
//            response.sendError(HttpServletResponse.SC_NOT_FOUND);   // Return a 'file not found' error
    		return false;
    	}
    	return this.checkCacheAndSend(request, response, file);
    }

	/**
	 * Get the package name from the jar entry path.
	 * @param name
	 * @return
	 */
	public static String getPackageFromName(String name)
	{
		if (name.lastIndexOf('/') != -1)
			name = name.substring(0, name.lastIndexOf('/'));
		if (name.startsWith("/"))
			name = name.substring(1);
		return name.replace('/', '.');		
	}
	
	/**
	 * Get the version number from the import properties.
	 * @param properties
	 * @return
	 */
    public static String getVersion(String[] properties)
    {
		if (properties.length > 0)
		{
			for (String property : properties)
			{
				if (property.startsWith(Constants.VERSION_ATTRIBUTE))
				{
					String[] props = property.split("\\ |\\[|\\]|\\(|\\)|\\=|\\\"");
					for (int i = 1; i < props.length; i++)
					{
						if (props[i].length() > 0)
							return props[i];
					}
				}
			}
		}
    	return null;
    }
    
    /**
     * Split the import properties.
     * @param value
     * @return
     */
    static public String[] parseImport(String value) {
    	return value.split(";");
    }
    
    /**
     * Split the import header properties.
     * @param value
     * @return
     */
    static public String[] parseHeader(String value, String regexInclude, String regexExclude) {

        if (value == null)
    		return EMPTY_ARRAY;
    	String[] properties = value.split(",");
    	for (int i = 0; i < properties.length; i++)
    	{
    		if (properties[i].indexOf(Constants.VERSION_ATTRIBUTE + "=") != -1)
    		{	// Version may have been split because it has commas
    			for (int j = i + 1; j < properties.length; j++)
    			{
    	    		if (!properties[j].endsWith("\""))
    	    			break;
	    			properties[i] = properties[i] + "," + properties[j];	// Version	
	    			properties[j] = "";
    			}
    		}
    		if (regexExclude != null)
    		    if (properties[i].matches(regexExclude))
    		        properties[i] = "";
            if (regexInclude != null)
                if (!properties[i].matches(regexInclude))
                    properties[i] = "";
    	}
    	return properties;
    }

    private static SimpleDateFormat httpDateFormat = null;
    static {
        httpDateFormat = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z", Locale.US);
        httpDateFormat.setCalendar(Calendar.getInstance(new SimpleTimeZone(0, "GMT")));
    }
     
    public synchronized static String getHttpDate(Date date){
    return httpDateFormat.format(date);
    }
     
    public synchronized static Date getDateFromHttpDate(String date) throws ParseException{
    return httpDateFormat.parse(date);
    }
    public static final String IF_MODIFIED_SINCE = "If-Modified-Since";
    public static final String LAST_MODIFIED = "Last-Modified";
     
    /**
     * Convenience method.
     * Note: You will have to cast the class or override this in your actual OSGi servlet.
     */
    public BundleContext getBundleContext()
    {
        return (BundleContext)super.getBundleContext();
    }

    // Note: Since this is a servlet, don't access or change these outside a synchronized method
    private String cachedPropertiesPath = null;
    private Properties cachedProperties = null;

    /**
     * 
     * @param propertiesFile
     */
    public synchronized HttpServletRequest readIfPropertiesFile(HttpServletRequest request, String propertiesPath, boolean returnPropertiesPathAsQuery)
    {
        if (propertiesPath == null)
            return request;
        propertiesPath = this.fixPathInfo(propertiesPath);

        if (propertiesPath.equals(cachedPropertiesPath))
        {   // Same as last time, use same properties
            if (request instanceof HttpServletRequestWithProperties)
                request = (HttpServletRequest)((HttpServletRequestWithProperties)request).getRequest();
            return new HttpServletRequestWithProperties(request, cachedProperties, returnPropertiesPathAsQuery ? propertiesPath : null);
        }
        
        URL url = null;
        try {
            url = ClassServiceUtility.getClassService().getResourceURL(propertiesPath, baseURL, null, this.getClass().getClassLoader());
        } catch (RuntimeException e) {
            e.printStackTrace();    // ???
            return request;
        }           
        Reader inStream = null;
        if (url != null)
        {
            try {
                inStream = new InputStreamReader(url.openStream());
            } catch (Exception e) {
                // Not found
            }
        }
        if (inStream == null)
            return request;
        else
        {
            try {
                // Todo may want to add cache info (using bundle lastModified).
                cachedProperties = new Properties();
                cachedProperties.load(inStream);
                inStream.close();
                String codeBase = this.getRequestParam(request, CODEBASE, null);
                if (codeBase != null)
                    if (cachedProperties.get(CODEBASE) == null)
                        cachedProperties.put(CODEBASE, codeBase);
            } catch (IOException e) {
                e.printStackTrace();
                return request;
            }
        }
        
        cachedPropertiesPath = propertiesPath;
        if (request instanceof HttpServletRequestWithProperties)
            request = (HttpServletRequest)((HttpServletRequestWithProperties)request).getRequest();
        return new HttpServletRequestWithProperties(request, cachedProperties, returnPropertiesPathAsQuery ? propertiesPath : null);
    }
    /**
     * Add all the dependent bundles (of this bundle) to the jar and package list.
     * @param jnlp
     * @param bundle
     * @param bundles
     * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @return true if the bundle has changed from last time
     */
    public Changes addProperties(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp, Changes bundleChanged)
    {
        Choice choice = this.getResource(jnlp, false);
        
        Properties properties = new Properties();
        String propertiesString = this.getRequestParam(request, PROPERTIES, null);
        if (propertiesString != null)
        {
            String[] propertyString = propertiesString.split(",");
            for (String property : propertyString)
            {
                int equals = property.indexOf('=');
                String key = (equals == -1) ? property : property.substring(0, equals);
                String value = (equals == -1) ? "" : property.substring(0, equals);
                properties.put(key, value);
            }
        }
        String key = "jnlp.packEnabled";
        if (properties.get(key) == null)
        {
            String value = this.getProperty(key);
            if (value == null)
                value = "true"; // Defaults to true
            properties.put(key, value);
        }
        Iterator<?> iterator = properties.keySet().iterator();
        while (iterator.hasNext())
        {
            key = (String)iterator.next();
            String value = (String)properties.get(key);
            Property property = new Property();
            property.setName(key);
            property.setValue(value);
            choice.setProperty(property);
        }
        return bundleChanged;
    }
    /**
     * Add all the dependent bundles (of this bundle) to the jar and package list.
     * @param jnlp
     * @param bundle
     * @param bundles
     * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @return true if the bundle has changed from last time
     */
    public Changes processComponents(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp, Map<String,String>components, Set<Bundle> bundles, Changes bundleChanged, String pathToJars)
    {
        String componentList = getRequestParam(request, EXCLUDE_COMPONENTS, null);
        if (componentList != null)
        {
            String[] comps = componentList.split(",");
            for (String comp : comps)
            {
                this.addComponentBundles(request, response, comp, bundles);
            }
        }
        componentList = getRequestParam(request, COMPONENTS, null);
        if (componentList != null)
        {
            String[] comps = componentList.split(",");
            for (String comp : comps)
            {
                String bundlePath = this.addComponentBundles(request, response, comp, bundles);
                if (bundlePath != null)
                    components.put(comp, bundlePath);
            }
        }
        return bundleChanged;
    }
    /**
     * Add all the dependent bundles (of this bundle) to the jar and package list.
     * @param jnlp
     * @param bundle
     * @param bundles
     * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @return true if the bundle has changed from last time
     */
    public Changes addComponents(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp, Map<String,String>components, Set<Bundle> bundles, Changes bundleChanged, String pathToJars)
    {
        for (String comp : components.keySet())
        {
            String bundlePath = components.get(comp);
            if (bundlePath != null)
            {
                Choice choice = this.getResource(jnlp, false);
                Extension extension = new Extension();
                extension.setName(comp);
                extension.setHref(bundlePath);
                choice.setExtension(extension);
            }
        }
        return bundleChanged;
    }
    
    public String addComponentBundles(HttpServletRequest request, HttpServletResponse response, String comp, Set<Bundle> bundles)
    {
        Jnlp jnlp = this.getJnlpFromProperties(request, response, comp);
        if (jnlp == null)
            return null;
        
        Iterator<Resources> iterator = jnlp.getResourceList().iterator();
        while (iterator.hasNext())
        {
            Resources resources = iterator.next();
            Iterator<Choice> choices = resources.getChoiceList().iterator();
            while (choices.hasNext())
            {
                Choice choice = choices.next();
                if (choice.ifJar())
                {
                    Jar jar = choice.getJar();
                    String part = jar.getPart();
                    for (Bundle bundle : this.getBundleContext().getBundles())
                    {
                        if (part.equals(bundle.getSymbolicName()))
                            this.isNewBundle(bundle, bundles);  // Add this bundle
                    }
                }
                if (choice.ifExtension())
                {   // Note: May want to add a test for recursive endless loop
                    Extension extension = choice.getExtension();
                    String component = extension.getName();
                    this.addComponentBundles(request, response, component, bundles);
                }
            }
        }
        
        return /* jnlp.getCodebase() + */ jnlp.getHref();   // The component path
    }

    public Jnlp getJnlpFromProperties(HttpServletRequest request, HttpServletResponse response, String comp)
    {
        HttpServletRequest compreq = this.readIfPropertiesFile(request, comp, true);
        if (compreq == request)
            return null;    // Invalid properties file

        ((HttpServletRequestWithProperties)compreq).setPropertiesOnly(true);
        
        if (response instanceof HttpServletResponseShell)
            response = (HttpServletResponse)((HttpServletResponseShell)response).getResponse();
        response = new HttpServletResponseShell(response);
        try {
            this.makeJnlp(compreq, response);

            IBindingFactory jc = BindingDirectory.getFactory(Jnlp.class);
            Reader reader = new StringReader(((HttpServletResponseShell)response).getBufferString());
            IUnmarshallingContext unmarshaller = jc.createUnmarshallingContext();
            Jnlp jnlp = (Jnlp)unmarshaller.unmarshalDocument(reader, OUTPUT_ENCODING);
            reader.close();
            return jnlp;
        } catch (JiBXException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ServletException e) {
            e.printStackTrace();
        }

        return null;
    }
    
    /**
     * A response wrapper that redirects the output to this printwriter.
     * @author don
     *
     */
    class HttpServletResponseShell extends HttpServletResponseWrapper
    {
        private PrintWriter writer = null;
        Writer stringWriter = null;
        ServletOutputStreamByteBuffer buffer = null;
        
        public HttpServletResponseShell(HttpServletResponse response)
        {
            super(response);
        }
        /**
         * Return the writer associated with this Response.
         *
         * @exception IllegalStateException if <code>getOutputStream</code> has
         *  already been called for this response
         * @exception IOException if an input/output error occurs
         */
        @Override
        public PrintWriter getWriter() throws IOException
        {
            stringWriter = new StringWriter();
            writer = new PrintWriter(stringWriter);
            return writer;
        }
        /**
         * The default behavior of this method is to return getOutputStream()
         * on the wrapped response object.
         */

        public ServletOutputStream getOutputStream() throws IOException {
            return buffer = new ServletOutputStreamByteBuffer();
        }
        
        public String getBufferString()
        {
            if (buffer != null)
            {
                return buffer.getBufferString();
            }
            if (writer != null)
            {
                writer.close();
                try {
                    stringWriter.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
                return stringWriter.toString();
            }
            return null;
        }
    }
    class ServletOutputStreamByteBuffer extends ServletOutputStream
    {
        OutputStream streamOut = new ByteArrayOutputStream();
        
        protected ServletOutputStreamByteBuffer()
        {
            super();
        }
       
        @Override
        public void write(int b) throws IOException {
            streamOut.write(b);
        }
        public String getBufferString()
        {
            try {
                streamOut.close();
            } catch (IOException e) {   // Never
            }
            return streamOut.toString();
        }
    }
    /**
     * Wrap the current servlet request and also return these extra properties.
     * @author don
     *
     */
    class HttpServletRequestWithProperties extends HttpServletRequestWrapper
    {
        Properties properties = null;
        boolean propertiesOnly = false; // Only return properties values, not request properties
        String propertiesPath = null;
        
        public HttpServletRequestWithProperties(HttpServletRequest request, Properties properties, String propertiesPath)
        {
            super(request);
            this.properties = properties;
            this.propertiesPath = propertiesPath;
        }
        /**
         * The default behavior of this method is to return getParameter(String name)
        * on the wrapped request object.
        */

       public String getParameter(String name) {
           String value = null;
           if (!propertiesOnly)
               value = super.getParameter(name);
           if (value == null)
               return properties.getProperty(name);
           return value;
       }
       /**
        * The default behavior of this method is to return getQueryString()
        * on the wrapped request object.
        */
       public String getQueryString() {
           String queryString = super.getQueryString();
           if (propertiesPath != null)
               return PROPERTIES_FILE + '=' + propertiesPath;
           return queryString;
       }
       /**
        * The default behavior of this method is to return getParameterNames()
       * on the wrapped request object.
       */
      public Enumeration<String> getParameterNames() {
          Enumeration<?> names = super.getParameterNames();
          Hashtable<String, String[]> map = new Hashtable<String, String[]>();
          if (!propertiesOnly)
          {
              while (names.hasMoreElements())
              {
                  String name = (String)names.nextElement();
                  map.put(name, this.getParameterValues(name));
              }
          }
          String[] tempArray = new String[1];
          for (Object key : properties.keySet())
          {
              tempArray[0] = (String)properties.get(key);
              map.put((String)key, tempArray);
          }
          return map.keys();
      }
      public void setPropertiesOnly(boolean propertiesOnly)
      {
          this.propertiesOnly = propertiesOnly;
      }
      public String getPropertiesPath()
      {
          return propertiesPath;
      }
    }
}
