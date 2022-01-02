/*
 * Copyright © 2012 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileReader;
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
import java.util.ArrayList;
import java.util.Date;
import java.util.Dictionary;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;

import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.WriteListener;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import org.jbundle.util.osgi.finder.ClassFinderActivator;
import org.jbundle.util.osgi.finder.ClassServiceUtility;
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
import org.jibx.schema.net.java.jnlp_6_0.J2se;
import org.jibx.schema.net.java.jnlp_6_0.Jar;
import org.jibx.schema.net.java.jnlp_6_0.Jar.Download;
import org.jibx.schema.net.java.jnlp_6_0.Jar.Main;
import org.jibx.schema.net.java.jnlp_6_0.Java;
import org.jibx.schema.net.java.jnlp_6_0.JavafxRuntime;
import org.jibx.schema.net.java.jnlp_6_0.Jnlp;
import org.jibx.schema.net.java.jnlp_6_0.Menu;
import org.jibx.schema.net.java.jnlp_6_0.Nativelib;
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
import org.jibx.schema.net.java.jnlp_6_0.JavafxDesc;
import org.osgi.framework.Bundle;
import org.osgi.framework.Constants;

/**
 * OSGi to Web Start translation Servlet.
 * This servlet delivers osgi applets as webstart applets.
 * For instructions,
 * @see http://www.jbundle.org/osgi-webstart
 * @author doncorley <don@tourgeek.com>
 */
public class OsgiWebStartServlet extends BundleUtilServlet /*JnlpDownloadServlet*/
{
	private static final long serialVersionUID = 1L;

    public static final String JNLP_MIME_TYPE = "application/x-java-jnlp-file";
    public static final String OUTPUT_ENCODING = "UTF-8";
    public static final String UNIQUE_CACHE_FILE_PREFIX = "cache-unique-";
    public static final String BASE_CACHE_FILE_PREFIX = "cache-base-";

    // Servlet params
    public static final String MAIN_CLASS = "mainClass";
    public static final String APPLET_CLASS = "appletClass";
    public static final String APPLET = "applet";   // Same as applet class
    
    public static final String VERSION = "version";
    public static final String OTHER_PACKAGES = "otherPackages";
    public static final String TEMPLATE = "template";
    
    // Optional params
    public static final String CODEBASE = "codebase";
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
    public static final String PROPERTIES_FILE = "webStartPropertiesFile";
    public static final String COMPONENTS = "webStartComponents";   // Jnlp component property files
    public static final String EXCLUDE_COMPONENTS = "excludeComponents";    // Exclude the bundles from these component files
    public static final String PROPERTIES = "webStartProperties";
    
    public static final String INCLUDE_DEFAULT = null;  // "org\\.jbundle\\..*|biz\\.source_code\\..*|com\\.tourgeek\\..*";
    public static final String EXCLUDE_DEFAULT = "org\\.osgi\\..*|javax\\..*|org\\.xml\\.sax.*|org\\.w3c\\.dom.*|org\\.omg\\..*";

    /**
     * Status of the bundles for this jnlp
     */
    enum BundleChangeStatus {
        UNKNOWN,    // Unknown
        NONE,       // Cached bundle matches request
        PARTIAL,    // Jnlp was changed
        ALL         // Request is completely different from cached jnlp
    };
    
    /**
     * XML Elements to change in the jnlp
     */
    enum ElementsToChange {
        NONE,           // Everything up-to-date
        CACHEABLE,      // Only add the cacheable tags
        UNIQUE,         // Only add the unique tags
        ALL             // Add all the tags
    };

    /**
     * Constructor.
     */
    public OsgiWebStartServlet() {
    	super();
    }
    
    /**
     * Constructor.
     * @param context
     */
    public OsgiWebStartServlet(Object context, String servicePid, Dictionary<String, Object> properties) {
    	this();
    	init(context, servicePid, properties);
    }
    
    /**
     * Constructor.
     * @param context
     */
    public void init(Object context, String servicePid, Dictionary<String, Object> properties) {
    	super.init(context, servicePid, properties);
    }
    
    /**
     * Free my resources.
     */
    public void free()
    {
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
                || (getRequestParam(request, OTHER_PACKAGES, null) != null)
                || (getRequestParam(request, PROPERTIES_FILE, null) != null))
            if (!request.getRequestURI().toUpperCase().endsWith(".HTML"))
                if (!request.getRequestURI().toUpperCase().endsWith(".HTM"))
                    if (getRequestParam(request, APPLET, null) == null) // Applet removes the 'applet' param
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
			StringBuilder sbBase = new StringBuilder();
            StringBuilder sbUnique = new StringBuilder();
			this.getJnlpCacheFilenames(request, sbBase, sbUnique);
            File jnlpBaseCacheFile = getBundleContext().getDataFile(sbBase.toString());
            removeCacheFileIfStale(request, jnlpBaseCacheFile);
            File jnlpUniqueCacheFile = getBundleContext().getDataFile(sbUnique.toString());
            removeCacheFileIfStale(request, jnlpUniqueCacheFile);

            if (jnlpUniqueCacheFile.exists())
                if (sendCacheIfCurrent(request, response, jnlpUniqueCacheFile))
                    return true;   // Returned the cached jnlp or a 'http cache up-to-date' response
			
            IBindingFactory jc = BindingDirectory.getFactory(Jnlp.class);
            IMarshallingContext marshaller = jc.createMarshallingContext();
            marshaller.setIndent(4);
            Jnlp jnlp = null;
            
            BundleChangeStatus bundleChangeStatus = BundleChangeStatus.UNKNOWN;

            // First step, create or read the cacheable elements.
            if (jnlpBaseCacheFile.exists())
			{    // Start from the cache file
		        InputStream inStream = new FileInputStream(jnlpBaseCacheFile);
                IUnmarshallingContext unmarshaller = jc.createUnmarshallingContext();
                jnlp = (Jnlp)unmarshaller.unmarshalDocument(inStream, OUTPUT_ENCODING);
                inStream.close();
                
                ElementsToChange elementsToChange = hasFileChanged(request, jnlpBaseCacheFile, true) ? ElementsToChange.CACHEABLE : ElementsToChange.NONE;
                if (elementsToChange == ElementsToChange.NONE)
                {
                    bundleChangeStatus = BundleChangeStatus.NONE;  // Cacheable section is already up-to-date
                }
                else
                {
                    bundleChangeStatus = setupJnlp(jnlp, request, response, false, elementsToChange); // Compare with the current jnlp file
                    if (bundleChangeStatus == BundleChangeStatus.PARTIAL)
                        setupJnlp(jnlp, request, response, true, elementsToChange);  // Something changed, need to rescan everything
                }
                jnlp.setCodebase(getJnlpCodebase(request));     // codebase is ALWAYS the source
			}
			else
			{    // Start from scratch
			    if (getRequestParam(request, TEMPLATE, null) != null)
                {   // Start from the template file
                    URL url = context.getResource(getRequestParam(request, TEMPLATE, null));
                    InputStream inStream = url.openStream();
                    IUnmarshallingContext unmarshaller = jc.createUnmarshallingContext();
                    jnlp = (Jnlp)unmarshaller.unmarshalDocument(inStream, OUTPUT_ENCODING);
                    inStream.close();
                }
                else
                    jnlp = new Jnlp();  // Start from an empty file
			    bundleChangeStatus = setupJnlp(jnlp, request, response, true, ElementsToChange.CACHEABLE); // Create the base jnlp file
			}
            if (bundleChangeStatus == BundleChangeStatus.UNKNOWN) {
                response.sendError(HttpServletResponse.SC_NOT_FOUND);   // Return a 'file not found' error
                return true;
            }

            if ((bundleChangeStatus == BundleChangeStatus.PARTIAL) || (bundleChangeStatus == BundleChangeStatus.ALL))
			    this.cacheThisJnlp(marshaller, jnlp, jnlpBaseCacheFile); // Template changed, re-cache it

            // Next step, create/read the unique elements
            if (bundleChangeStatus == BundleChangeStatus.NONE)
                if (jnlpUniqueCacheFile.exists())
                    if (checkCacheAndSend(request, response, jnlpUniqueCacheFile, true, true))
                        return true;   // Returned the cached jnlp or a cache up-to-date response
            setupJnlp(jnlp, request, response, false, ElementsToChange.UNIQUE);  // Add the unique params - this is fast
            if (bundleChangeStatus == BundleChangeStatus.NONE)
                if (!jnlpUniqueCacheFile.exists())
                    bundleChangeStatus = BundleChangeStatus.ALL;  // No unique cache file means create the unique cache file
            if ((bundleChangeStatus == BundleChangeStatus.PARTIAL) || (bundleChangeStatus == BundleChangeStatus.ALL))
                cacheThisJnlp(marshaller, jnlp, jnlpUniqueCacheFile);
			
            Date lastModified = new Date(jnlpBaseCacheFile.lastModified());
            response.addHeader(LAST_MODIFIED, getHttpDate(lastModified));
            
            Writer writer = response.getWriter();
            marshaller.marshalDocument(jnlp, OUTPUT_ENCODING, null, writer);
            
            if (DEBUG)
                debugWriteJnlp(marshaller, jnlp);

            return true;
		} catch (JiBXException e) {
			e.printStackTrace();
		}
	    return false;
	}
    /**
     * Write this jnlp to this cache file.
     * @param marshaller
     * @param jnlp
     * @param file
     * @throws IOException
     * @throws JiBXException
     */
    public void cacheThisJnlp(IMarshallingContext marshaller, Jnlp jnlp, File file)
            throws IOException, JiBXException
    {       // Cache this jnlp
        Writer fileWriter = new FileWriter(file);
        marshaller.marshalDocument(jnlp, OUTPUT_ENCODING, null, fileWriter);   // Cache jnlp
        fileWriter.close();
    }
    /**
     * Is this a main (applet or application) jnlp?
     * @param request
     * @return true if it is a main jnlp file
     */
    public boolean isMainJnlp(HttpServletRequest request)
    {
        if (this.getRequestParam(request, MAIN_CLASS, null) != null)
            return true;
        if (this.getRequestParam(request, APPLET_CLASS, null)!= null)
            return true;
        return false;   // Resource only jnlp
    }

    /**
     * Get the jnlp cache file name.
     * @param request
     * @param sbBase Returns the cache file name of using just the component parameters
     * @param sbUnique Returns the cache file name of using all the parameters
     */
    @SuppressWarnings("unchecked")
    protected void getJnlpCacheFilenames(HttpServletRequest request, StringBuilder sbBase, StringBuilder sbUnique)
    {
        // sb.append(getCodebase(request)); // Don't use the codebase
        // sbBase.append(getHref(request)).append('/');    // Don't use the base url
        // sb.append(request.getQueryString());
        Enumeration<String> e = request.getParameterNames();
        SortedSet<String> names = new TreeSet<String>();
        while (e.hasMoreElements())
        {	// Sort the params
        	names.add(e.nextElement());
        }
        for (String paramName : names)
        {
            if (isCachableParam(paramName))
            {
            	if (sbBase.length() > 0)
            		sbBase.append('&');
                sbBase.append(paramName).append('=').append(request.getParameter(paramName));
            }
        	if (sbUnique.length() > 0)
        		sbUnique.append('&');
            sbUnique.append(paramName).append('=').append(request.getParameter(paramName));
        }
        String mainPackage = ClassFinderActivator.getPackageName(this.getRequestParam(request, MAIN_CLASS, null), false);
        if (mainPackage == null)
            mainPackage = ClassFinderActivator.getPackageName(this.getRequestParam(request, APPLET_CLASS, null), false);
        if (mainPackage != null)
        {
            sbBase.append('&').append("mainPackage").append('=').append(mainPackage);
            sbUnique.append('&').append("mainPackage").append('=').append(mainPackage);
        }
        getHashFileName(sbBase, BASE_CACHE_FILE_PREFIX);
        getHashFileName(sbUnique, UNIQUE_CACHE_FILE_PREFIX);
    }
    /**
     * Calculate the cache file name from this url.
     */
    StringBuilder getHashFileName(StringBuilder sbURL, String filePrefix)
    {
        String hash = Integer.toString(sbURL.toString().hashCode()).replace('-', 'a');
        sbURL.delete(0, sbURL.length());
        sbURL.append(filePrefix).append(hash).append(".jnlp");
        return sbURL;
    }
    /**
     * Populate the Jnlp xml.
     * @param jnlp The jnlp to modify
     * @param request The http request
     * @param response The http response
     * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @param elementsToChange Which xml elements should I change?
     * @return How much have I changed this jnlp?
     */
    protected BundleChangeStatus setupJnlp(Jnlp jnlp, HttpServletRequest request, HttpServletResponse response, boolean forceScanBundle, ElementsToChange elementsToChange)
    {
        BundleChangeStatus bundleChangeStatus = BundleChangeStatus.UNKNOWN;
        if (elementsToChange == ElementsToChange.NONE)
            bundleChangeStatus = BundleChangeStatus.NONE;   // Don't re-cache the jnlp if I'm not changing base info

        String mainClass = getRequestParam(request, MAIN_CLASS, null);
		if (mainClass == null)
		    mainClass = getRequestParam(request, APPLET_CLASS, null);
        String packageName = ClassFinderActivator.getPackageName(mainClass, false);
        if (packageName == null)
        {
            packageName = getRequestParam(request, OTHER_PACKAGES, null);
            if (packageName.indexOf(',') != -1)
                packageName = packageName.substring(0, packageName.indexOf(','));
        }
        if (forceScanBundle)
            getResource(jnlp, true, null, null);   // Clear the resource entries and create a new one
        
        Bundle bundle = null;
        if ((elementsToChange == ElementsToChange.CACHEABLE) || (elementsToChange == ElementsToChange.ALL))
        {   // base params
            String version = getRequestParam(request, VERSION, null);
            
    		bundle = findBundle(packageName, version);
    		if (bundle == null)
    		    return BundleChangeStatus.UNKNOWN;
    
    		setCachableInformation(jnlp, bundle, request);
        }

        if ((elementsToChange == ElementsToChange.UNIQUE) || (elementsToChange == ElementsToChange.ALL))
        {   // Unique params
            jnlp.setCodebase(getJnlpCodebase(request));
    		jnlp.setHref(getHref(request) + '?' + request.getQueryString());
    		jnlp.setSpec("1.0+");
		
    		setUniqueInformation(jnlp, mainClass, request);
        	Security security = new Security();
        	jnlp.setSecurity(security);
    
            if (mainClass != null)
                setJava(jnlp, request); // For applets or apps
		
            addProperties(request, response, jnlp);
        }

        if ((elementsToChange == ElementsToChange.CACHEABLE) || (elementsToChange == ElementsToChange.ALL))
        {   // base params
            String pathToJars = getPathToJars(request);
            Set<Bundle> bundles = new HashSet<Bundle>();    // Initial empty Bundle list
            
    		Main main = (mainClass != null) ? Main.TRUE : Main.FALSE;
    		bundleChangeStatus = addBundle(request, jnlp, bundle, main, forceScanBundle, bundleChangeStatus, pathToJars);
    		isNewBundle(bundle, bundles);	// Add only once
    		
    		Map<String, String> components = new LinkedHashMap<String, String>();
    		bundleChangeStatus = processComponents(request, response, jnlp, components, bundles, bundleChangeStatus, pathToJars);
    
            String regexInclude = getRequestParam(request, INCLUDE, INCLUDE_DEFAULT);
            String regexExclude = getRequestParam(request, EXCLUDE, EXCLUDE_DEFAULT);
            bundleChangeStatus = addDependentBundles(request, jnlp, getBundleProperty(bundle, Constants.IMPORT_PACKAGE), bundles, forceScanBundle, bundleChangeStatus, regexInclude, regexExclude, pathToJars);
    		
    		if (getRequestParam(request, OTHER_PACKAGES, null) != null)
    		    bundleChangeStatus = addDependentBundles(request, jnlp, getRequestParam(request, OTHER_PACKAGES, null).toString(), bundles, forceScanBundle, bundleChangeStatus, regexInclude, regexExclude, pathToJars);
            if (getRequestParam(request, APPLET_CLASS, null) != null)
                if (!getRequestParam(request, APPLET_CLASS, null).equals(getRequestParam(request, APPLET, null)))
                    bundleChangeStatus = addDependentBundles(request, jnlp, ClassFinderActivator.getPackageName(getRequestParam(request, APPLET_CLASS, null), false), bundles, forceScanBundle, bundleChangeStatus, regexInclude, regexExclude, pathToJars);
            
    		bundleChangeStatus = addComponents(request, response, jnlp, components, bundles, bundleChangeStatus, pathToJars);
        }
        
        if ((elementsToChange == ElementsToChange.UNIQUE) || (elementsToChange == ElementsToChange.ALL))
        {   // Unique params
            if (getRequestParam(request, MAIN_CLASS, null) != null)
    			setApplicationDesc(jnlp, mainClass, request);
    		else if (getRequestParam(request, APPLET_CLASS, null) != null)
    			setAppletDesc(jnlp, mainClass, request);
            else
                setComponentDesc(jnlp, request);
        }
        
		return bundleChangeStatus;
    }
        
    /**
     * Get the jnlp href prefix to this servlet.
     * If a codebase was specified, this must
     * end up starting at the root servlet path.
     * @param request
     * @return
     */
    private String getHref(HttpServletRequest request)
    {
        String respath = request.getRequestURI();
        if (respath == null)
        	return "";
        String codebase = this.getRequestParam(request, CODEBASE, null);
        if ((codebase == null) || (codebase.length() == 0))
            codebase = "/";
        return getRelativePath(respath, codebase);
    }
    /**
     * Get the path to the jar files (root of context path if codebase specified).
     * This is the start of the relative (to codebase) url to the jar files.
     * Typically this is blank '', but if a codebase was specified, this must
     * end up pointing to the root servlet path.
     * @param request
     * @return
     */
    private String getPathToJars(HttpServletRequest request)
    {
        String servletPath = request.getServletPath();
        if ((servletPath == null) || (servletPath.length() == 0))
            return "";  // If their servlet is at the root, they don't need to use a codebase
        String codebase = this.getRequestParam(request, CODEBASE, null);
        String path = null;
        if ((codebase == null) || (codebase.length() == 0))
            path = servletPath;  // If they don't have a codebase, jars are served relative to the servlet path
        else
        	path = getRelativePath(servletPath, codebase);
        if (!path.endsWith("/"))
            path = path + "/";
        return path;
    }
    /**
     * Calculate the relative path of this path given the servlet path.
     * @param servletPath
     * @param rootPathToFix
     * @return The path relative to the given path
     */
    private String getRelativePath(String servletPath, String rootPathToFix)
    {
        if (rootPathToFix == null)
            return "";
        if (servletPath.startsWith(rootPathToFix))
            rootPathToFix = servletPath.substring(rootPathToFix.length());
        if (rootPathToFix.startsWith("/"))
            rootPathToFix = rootPathToFix.substring(1);
        return rootPathToFix;
    }
    /**
     * Set up the jnlp information fields.
     * @param jnlp
     */
    public void setCachableInformation(Jnlp jnlp, Bundle bundle, HttpServletRequest request)
    {
        Information information = this.getInformation(jnlp);
        Title title = new Title();
        if (getBundleProperty(bundle, Constants.BUNDLE_NAME) != null)
            title.setTitle(getBundleProperty(bundle, Constants.BUNDLE_NAME));
        else if (getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME) != null)
            title.setTitle(getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME));
        else
            title.setTitle("Jnlp Application");
        information.setTitle(title);        
        
        Vendor vendor = new Vendor();
        if (getBundleProperty(bundle, Constants.BUNDLE_VENDOR) != null)
            vendor.setVendor(getBundleProperty(bundle, Constants.BUNDLE_VENDOR));
        else
            vendor.setVendor("jbundle.org");
        information.setVendor(vendor);
        
        Homepage homepage = new Homepage();
        if (getBundleProperty(bundle, Constants.BUNDLE_DOCURL) != null)
            homepage.setHref(getBundleProperty(bundle, Constants.BUNDLE_DOCURL));
        else
            homepage.setHref("http://www.jbundle.org");
        information.setHomepage(homepage);
        
        if (getBundleProperty(bundle, Constants.BUNDLE_DESCRIPTION) != null)
            this.setJnlpDescription(information, Kind.ONELINE, getBundleProperty(bundle, Constants.BUNDLE_DESCRIPTION));
        else
            this.setJnlpDescription(information, Kind.ONELINE, "Jnlp Application");

        if (getBundleProperty(bundle, Constants.BUNDLE_NAME) != null)
            this.setJnlpDescription(information, Kind.SHORT, getBundleProperty(bundle, Constants.BUNDLE_NAME));
        else if (getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME) != null)
            this.setJnlpDescription(information, Kind.SHORT, getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME));
        else
            this.setJnlpDescription(information, Kind.SHORT, "Jnlp Application");
    }
    /**
     * Set the one-line description
     * @param information
     * @param desc
     */
    public void setJnlpDescription(Information information, Kind kind, String desc)
    {
        Description description = getJnlpDescription(information, kind);
        description.setString(desc);
    }
    /**
     * Set the one-line description
     * @param information
     * @param kind
     */
    public Description getJnlpDescription(Information information, Kind kind)
    {
        if (information.getDescriptionList() == null)
            information.setDescriptionList(new ArrayList<Description>());
        for (int index = 0; index < information.getDescriptionList().size() ; index++)
        {
            Description description = information.getDescriptionList().get(index);
            if (description.getKind() == kind)
                return description;
        }
        Description description = new Description();
        description.setKind(kind);
        information.getDescriptionList().add(description);
        return description;
    }
    /**
     * Set up the jnlp information fields.
     * @param jnlp
     */
    public void setUniqueInformation(Jnlp jnlp, String mainClass, HttpServletRequest request)
	{
    	Information information = this.getInformation(jnlp);
    	
    	if (getRequestParam(request, TITLE, null) != null)
    	{
            Title title = new Title();
    		title.setTitle(getRequestParam(request, TITLE, null));
    		information.setTitle(title);
    	}
    	
    	if (getRequestParam(request, VENDOR, null) != null)
    	{
            Vendor vendor = new Vendor();
        	vendor.setVendor(getRequestParam(request, VENDOR, null));
        	information.setVendor(vendor);
    	}
    	
    	if (getRequestParam(request, HOME_PAGE, null) != null)
    	{
            Homepage homepage = new Homepage();
    		homepage.setHref(getRequestParam(request, HOME_PAGE, null));
    		information.setHomepage(homepage);
    	}
    	
        if (getRequestParam(request, DESCRIPTION, null) != null)
        	this.setJnlpDescription(information, Kind.ONELINE, getRequestParam(request, DESCRIPTION, null));

        if (mainClass != null)
        { // For applets or apps
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
	}
    /**
     * Set up the jnlp information tag.
     * @param jnlp
     */
    public Information getInformation(Jnlp jnlp)
    {
        if (jnlp.getInformationList() == null)
            jnlp.setInformationList(new ArrayList<Information>());
        List<Information> informationList = jnlp.getInformationList();
        if (informationList.size() == 0)
            informationList.add(new Information());
        Information information = informationList.get(0);
        return information;
    }
    
    /**
     * Add the java lines.
     * @param jnlp
     */
    public void setJava(Jnlp jnlp, HttpServletRequest request)
	{
		Choice choice = getResource(jnlp, false, Java.class, null);	// Clear the entries and create a new one
		Java java = choice.getJava();
		if (java == null)
		{
		    if (getResource(jnlp, false, J2se.class, null).getJ2se() != null)
		    {
		        setJ2se(jnlp, request);   // Using legacy format
		        return;
		    }
		    choice.setJava(java = new Java());
		}
		if ((java.getVersion() == null) || (getRequestParam(request, JAVA_VERSION, null) != null))
		    java.setVersion(getRequestParam(request, JAVA_VERSION, "1.6+"));
		if (getRequestParam(request, INITIAL_HEAP_SIZE, null) != null)
		    java.setInitialHeapSize(getRequestParam(request, INITIAL_HEAP_SIZE, null));
        if (getRequestParam(request, MAX_HEAP_SIZE, null) != null)
            java.setMaxHeapSize(getRequestParam(request, MAX_HEAP_SIZE, null));
	}
    /**
     * Add the j2se lines.
     * @param jnlp
     */
    public void setJ2se(Jnlp jnlp, HttpServletRequest request)
    {
        Choice choice = getResource(jnlp, false, J2se.class, null); // Clear the entries and create a new one
        J2se java = choice.getJ2se();
        if (java == null)
            choice.setJ2se(java = new J2se());
        if ((java.getVersion() == null) || (getRequestParam(request, JAVA_VERSION, null) != null))
            java.setVersion(getRequestParam(request, JAVA_VERSION, "1.6+"));
        if (getRequestParam(request, INITIAL_HEAP_SIZE, null) != null)
            java.setInitialHeapSize(getRequestParam(request, INITIAL_HEAP_SIZE, null));
        if (getRequestParam(request, MAX_HEAP_SIZE, null) != null)
            java.setMaxHeapSize(getRequestParam(request, MAX_HEAP_SIZE, null));
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
	public BundleChangeStatus addBundle(HttpServletRequest request, Jnlp jnlp, Bundle bundle, Main main, boolean forceScanBundle, BundleChangeStatus bundleChanged, String pathToJars)
	{
		String name = getBundleProperty(bundle, Constants.BUNDLE_SYMBOLICNAME);
		String version = getBundleProperty(bundle, Constants.BUNDLE_VERSION);
		String activationPolicy = getBundleProperty(bundle, Constants.BUNDLE_ACTIVATIONPOLICY);
        if ((activationPolicy == null) || (activationPolicy.length() == 0))
            activationPolicy = this.getRequestParam(request, name + '.' + Constants.BUNDLE_ACTIVATIONPOLICY, null);
		if ((activationPolicy == null) || (activationPolicy.length() == 0))
		    activationPolicy = this.getRequestParam(request, Constants.BUNDLE_ACTIVATIONPOLICY, null);
        if ((activationPolicy == null) || (activationPolicy.length() == 0))
            activationPolicy = (String)this.getProperty(Constants.BUNDLE_ACTIVATIONPOLICY);
		Download download = Constants.ACTIVATION_LAZY.equalsIgnoreCase(activationPolicy) ? Download.LAZY : Download.EAGER;
		String filename = name + '-' + version + ".jar";
		boolean pack = !"false".equalsIgnoreCase((String)this.getProperty("jnlp.packEnabled"));   // Pack by default
		String[] packages = moveBundleToJar(bundle, filename, forceScanBundle, pack);
		if (packages == null) // No changes on this bundle
	        return (bundleChanged == BundleChangeStatus.NONE || bundleChanged == BundleChangeStatus.UNKNOWN) ? BundleChangeStatus.NONE : BundleChangeStatus.PARTIAL;
		if (main == null)
			main = Main.FALSE;
		if (pathToJars != null)
		    filename = pathToJars + filename;
		Jar jar = addJar(jnlp, filename, name, main, download);
		for (String packageName : packages)
		{
			addPackage(jnlp, jar, packageName, Recursive.FALSE);
		}
        return (bundleChanged == BundleChangeStatus.ALL || bundleChanged == BundleChangeStatus.UNKNOWN) ? BundleChangeStatus.ALL : BundleChangeStatus.PARTIAL;
	}
	
	/**
	 * Add all the dependent bundles (of this bundle) to the jar and package list.
	 * @param jnlp
	 * @param importPackage
	 * @param bundles
	 * @param forceScanBundle Scan the bundle for package names even if the cache is current
     * @return true if the bundle has changed from last time
	 */
	public BundleChangeStatus addDependentBundles(HttpServletRequest request, Jnlp jnlp, String importPackage, Set<Bundle> bundles, boolean forceScanBundle, BundleChangeStatus bundleChanged, String regexInclude, String regexExclude, String pathToJars)
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
		Choice choice = getResource(jnlp, false, null, null);
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
		Choice choice = getResource(jnlp, false, null, null);
		_Package pack = new _Package();
		choice.setPackage(pack);
		pack.setPart(jar.getPart());
		pack.setName(packagePath + ".*");
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
        if ((applicationDesc.getMainClass() != null) && (jnlp.getJavafxDesc() != null))
        {  // Special case - JavaFX jnlp definition
            JavafxDesc javafxDesc = jnlp.getJavafxDesc();
            javafxDesc.setHeight(getRequestParam(request, HEIGHT, "600"));
            javafxDesc.setWidth(getRequestParam(request, WIDTH, "350"));
            javafxDesc.setMainClass(mainClass);
            mainClass = applicationDesc.getMainClass();  // Don't change the main class in the jnlp definition.
        }
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
    public void setAppletDesc(Jnlp jnlp, String mainClass, HttpServletRequest request)
    {
        String appletName = null;
        if (getRequestParam(request, TITLE, null) != null)
            appletName = getRequestParam(request, TITLE, null);
        else
            appletName = this.getJnlpDescription(this.getInformation(jnlp), Kind.SHORT).getString();
    	if (jnlp.getAppletDesc() == null)
    		jnlp.setAppletDesc(new AppletDesc());
    	AppletDesc appletDesc = jnlp.getAppletDesc();
    	if ((appletDesc.getMainClass() != null) && (jnlp.getJavafxDesc() != null))
    	{  // Special case - JavaFX jnlp definition
            JavafxDesc javafxDesc = jnlp.getJavafxDesc();
            javafxDesc.setHeight(getRequestParam(request, HEIGHT, "600"));
            javafxDesc.setWidth(getRequestParam(request, WIDTH, "350"));
            javafxDesc.setMainClass(mainClass);
            javafxDesc.setName(appletName);
            mainClass = appletDesc.getMainClass();  // Don't change the main class in the jnlp definition.
    	}
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
     * @param request
     */
    public void setComponentDesc(Jnlp jnlp, HttpServletRequest request)
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
        if (name.startsWith(OsgiWebStartServlet.class.getPackage().getName()))
            return true;
        return false;
    }
    
    /**
     * Create a new resource entry.
     * @param jnlp
     * @return
     */
    protected Choice getResource(Jnlp jnlp, boolean firstTime, Class<?> targetClass, String name)
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
    		    if ((choiceList.get(i).ifJar()) || (choiceList.get(i).ifPackage()))
    		        choiceList.remove(i);
    		}
		
        if (targetClass != null)
            for (int i = choiceList.size() - 1; i >= 0; i--)
            {
                if (isClassMatch(choiceList.get(i), targetClass))
                {
                    Choice choice = choiceList.get(i);;
                    if (name == null)
                        return choice;
                    if (choice.ifProperty())
                        if (name.equals(choice.getProperty().getName()))
                            return choice;
                    if (choice.ifExtension())
                        if (name.equals(choice.getExtension().getName()))
                            return choice;
                }
            }
        
		Choice choice = new Choice();
		choiceList.add(choice);
		return choice;    	
    }
    /**
     * Lame code.
     * @param choice
     * @param targetClass
     * @return
     */
    public boolean isClassMatch(Choice choice, Class<?> targetClass)
    {
        if (targetClass == null)
            return false;
        if ((targetClass == Extension.class) && (choice.ifExtension()))
            return true;
        if ((targetClass == J2se.class) && (choice.ifJ2se()))
            return true;
        if ((targetClass == Jar.class) && (choice.ifJar()))
            return true;
        if ((targetClass == Java.class) && (choice.ifJava()))
            return true;
        if ((targetClass == JavafxRuntime.class) && (choice.ifJavafxRuntime()))
            return true;
        if ((targetClass == Nativelib.class) && (choice.ifNativelib()))
            return true;
        if ((targetClass == _Package.class) && (choice.ifPackage()))
            return true;
        if ((targetClass == Property.class) && (choice.ifProperty()))
            return true;
        return false;
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
        if (getRequestParam(request, APPLET, null) != null)
            return this.sendResourceFile(DEFAULT_APPLET_PATH, response);   // Special case, ?applet= means send applet.html
    	if (path == null)
    		return false;
    	path = path.substring(path.lastIndexOf("/") + 1);  // Jars are placed at the root of the cache directory

    	File file = getBundleContext().getDataFile(path);
    	if ((file == null) || (!file.exists()))
    	{  // Don't return a 404, try to read the file using JnlpDownloadServlet
//            response.sendError(HttpServletResponse.SC_NOT_FOUND);   // Return a 'file not found' error
    		return false;
    	}
    	return this.checkCacheAndSend(request, response, file, false, false);
    }
    public static final String DEFAULT_APPLET_PATH = "/docs/applet.html";

    // Note: Since this is a servlet, don't access or change these outside a synchronized method
    private String cachedPropertiesPath = null;
    private Properties cachedProperties = null;

    /**
     * If a properties file is specified, modify the request object to return those properties
     * @param request
     * @param propertiesFile
     */
    public synchronized HttpServletRequest readIfPropertiesFile(HttpServletRequest request, String propertiesPath, boolean propertiesOnly)
    {
        if (propertiesPath == null)
            return request;
        propertiesPath = this.fixPathInfo(propertiesPath);

        if (propertiesPath.equals(cachedPropertiesPath))
        {   // Same as last time, use same properties
            if (request instanceof HttpServletRequestWithProperties)
                request = (HttpServletRequest)((HttpServletRequestWithProperties)request).getRequest();
            return new HttpServletRequestWithProperties(request, cachedProperties, propertiesOnly ? propertiesPath : null, propertiesOnly);
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
        return new HttpServletRequestWithProperties(request, cachedProperties, propertiesOnly ? propertiesPath : null, propertiesOnly);
    }
    /**
     * Add all the dependent bundles (of this bundle) to the jar and package list.
     * @param jnlp
     * @param request
     * @param response
     * @return true if the bundle has changed from last time
     */
    public void addProperties(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp)
    {
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
            String value = (String)this.getProperty(key);
            if (value == null)
                value = "true"; // Defaults to true
            properties.put(key, value);
        }
        Iterator<?> iterator = properties.keySet().iterator();
        while (iterator.hasNext())
        {
            key = (String)iterator.next();
            String value = (String)properties.get(key);
            Choice choice = this.getResource(jnlp, false, Property.class, key);
            Property property = choice.getProperty();
            if (property == null)
                choice.setProperty(property = new Property());
            property.setName(key);
            property.setValue(value);
        }
    }
    /**
     * Add all the dependent bundles (of this bundle) to the jar and package list.
     * @param jnlp
     * @param bundles
     * @return true if the bundle has changed from last time
     */
    public BundleChangeStatus processComponents(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp, Map<String,String>components, Set<Bundle> bundles, BundleChangeStatus bundleChanged, String pathToJars)
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
     * @param bundles
     * @return true if the bundle has changed from last time
     */
    public BundleChangeStatus addComponents(HttpServletRequest request, HttpServletResponse response, Jnlp jnlp, Map<String,String>components, Set<Bundle> bundles, BundleChangeStatus bundleChanged, String pathToJars)
    {
        for (String comp : components.keySet())
        {
            String bundlePath = components.get(comp);
            if (bundlePath != null)
            {
                Choice choice = this.getResource(jnlp, false, Extension.class, comp);
                Extension extension = choice.getExtension();
                if (extension == null)
                    choice.setExtension(extension = new Extension());
                extension.setName(comp);
                String codebase = request.getParameter(CODEBASE);
                if (codebase == null)
                    codebase = "/";
                bundlePath = bundlePath + '&' + CODEBASE + '=' + codebase;
                if (extension.getHref() == null)
                    extension.setHref(bundlePath);
            }
        }
        return bundleChanged;
    }
    
    /**
     * Add the component bundles
     * @param request
     * @param response
     * @param comp
     * @param bundles
     * @return
     */
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

    /**
     * Get the jnlp from the properties in this request.
     * @param request
     * @param response
     * @param comp
     * @return
     */
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
     * Is this one of the params that changes the base jnlp file?
     * @param paramName
     * @return
     */
    protected boolean isCachableParam(String paramName)
    {
        for (String param : params)
        {
            if (paramName.endsWith(param))
                return true;
        }
        return false;
    }
    private String[] params = {
//        MAIN_CLASS,
//        APPLET_CLASS,
        VERSION,
        OTHER_PACKAGES,
        TEMPLATE,
        PROPERTIES_FILE,
        COMPONENTS,
        EXCLUDE_COMPONENTS,
        Constants.BUNDLE_ACTIVATIONPOLICY,
    };
    
    /**
     * Does this cached file contain the same codebase?
     * If not, fix the codebase and return the new jnlp string.
     * If so, return null.
     * @param request
     * @param file
     * @return
     */
    String CODEBASE_NAME = CODEBASE + "=\"";
    public String fixCachedFile(HttpServletRequest request, File file)
    {
        String requestCodebase = getJnlpCodebase(request);
        try {
            // If they want it again, send them my cached copy
            Reader inStream = new FileReader(file);
            StringWriter writer = new StringWriter();
            copyStream(inStream, writer, true);
            StringBuffer jnlpString = writer.getBuffer();
            inStream.close();
            writer.close();
            if (jnlpString == null)
                return null;
            int start = jnlpString.indexOf(CODEBASE_NAME);
            if (start == -1)
                return null;
            start = start + CODEBASE_NAME.length();
            int end = jnlpString.indexOf("\"", start);
            if (end == -1)
                return null;
            if (jnlpString.substring(start, end).equalsIgnoreCase(requestCodebase))
                return null;    // same codebase = good
            jnlpString.replace(start, end, requestCodebase);
            return jnlpString.toString();
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    /**
     * Get the full codebase (including host and port) from the request path.
     * By default, this is the servlet path (without the trailing '/')
     * To change this, supply a 'codebase' parameter with your intended base path.
     * @param request
     * @return
     */
    protected String getJnlpCodebase(HttpServletRequest request)
    {
        String urlprefix = getUrlPrefix(request);
        String codebase = this.getRequestParam(request, CODEBASE, null);
        if ((codebase == null) || (codebase.length() == 0))
            codebase = "/";
        return urlprefix + codebase;
    }
    /**
     *  This code is heavily inspired by the stuff in HttpUtils.getRequestURL
     */
    protected String getUrlPrefix(HttpServletRequest request) {
        StringBuffer url = new StringBuffer();
        String scheme = request.getScheme();
        String xscheme = request.getHeader("X-Forwarded-Proto");
        if ((xscheme != null) && (xscheme.length() > 0))
            scheme = xscheme;
        int port = request.getServerPort();
        try {
            int xport = request.getIntHeader("X-Forwarded-Port");
            if (xport != -1)
                port = xport;
        } catch (NumberFormatException ex) {
            //Ignore
        }
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
        /**
         * This method can be used to determine if data can be written without blocking.
         *
         * @return <code>true</code> if a write to this <code>ServletOutputStream</code>
         *  will succeed, otherwise returns <code>false</code>.
         *
         *  @since Servlet 3.1
         */
        public boolean isReady()
        {
            return true;    // TODO Fix this
        }

        /**
         * Instructs the <code>ServletOutputStream</code> to invoke the provided
         * {@link WriteListener} when it is possible to write
         *
         *
         * @param writeListener the {@link WriteListener} that should be notified
         *  when it's possible to write
         *
         * @exception IllegalStateException if one of the following conditions is true
         * <ul>
         * <li>the associated request is neither upgraded nor the async started
         * <li>setWriteListener is called more than once within the scope of the same request.
         * </ul>
         *
         * @throws NullPointerException if writeListener is null
         *
         * @since Servlet 3.1
         */
        public void setWriteListener(WriteListener writeListener)
        {
            // TODO Fix this
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
        
        public HttpServletRequestWithProperties(HttpServletRequest request, Properties properties, String propertiesPath, boolean propertiesOnly)
        {
            super(request);
            this.properties = properties;
            this.propertiesPath = propertiesPath;
            this.propertiesOnly = propertiesOnly;
        }
        /**
         * The default behavior of this method is to return getParameter(String name)
        * on the wrapped request object.
        */

       public String getParameter(String name) {
           String value = null;
           if (!propertiesOnly)
                   value = super.getParameter(name);
           if (PROPERTIES_FILE.equals(name))
               if (propertiesPath != null)
                   if (propertiesPath.equals(value))
                       value = null;    // Don't return the name of the properties
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
               queryString = PROPERTIES_FILE + '=' + propertiesPath;
           String codebase = properties.getProperty(CODEBASE);
           if (codebase != null)
               if (!queryString.contains(CODEBASE_NAME))
                   queryString = queryString + '&' + CODEBASE + '=' + codebase;
           return queryString;
       }
       /**
       * Returns the part of this request's URL that calls the servlet.
       * @return      a <code>String</code> containing
       */
       public String getServletPath()
       {
           return super.getServletPath();
       }
       /**
       * Returns the part of this request's URL from the protocol name up to the query string
       * @return      a <code>String</code> containing
       */
      public String getRequestURI()
      {
          return super.getRequestURI();
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
          map.remove(PROPERTIES_FILE);    // Don't return the name of my properties file - no recursion
          return map.keys();
      }
      public boolean setPropertiesOnly(boolean propertiesOnly)
      {
          boolean oldProperties = this.propertiesOnly;
          this.propertiesOnly = propertiesOnly;
          return oldProperties;
      }
      public String getPropertiesPath()
      {
          return propertiesPath;
      }
    }
    /**
     * 
     * @param marshaller
     * @param jnlp
     * @throws JiBXException
     */
    public void debugWriteJnlp(IMarshallingContext marshaller, Jnlp jnlp) throws JiBXException
    {
        Writer writer = new StringWriter();
        marshaller.marshalDocument(jnlp, OUTPUT_ENCODING, null, writer);
        String string = ((StringWriter)writer).toString();
        System.out.println(string);
    }
}
