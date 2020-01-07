package org.jbundle.util.osgi.webstart;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.Writer;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Dictionary;
import java.util.Locale;
import java.util.SimpleTimeZone;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.jbundle.util.webapp.base.BaseOsgiServlet;
import org.osgi.framework.BundleContext;
import org.osgi.framework.BundleEvent;
import org.osgi.framework.BundleListener;

/**
 * BundleCacheServlet - Handle resource caching and checking cache dates against the
 * http request and the last bundle update.
 * Note: Is it not required that this inherits from JnlpDownloadServlet,
 * I was hoping to using some of that code, but most of the useful stuff is private.
 * I do call JnlpDownloadServlet methods if I don't know what to do with the call.
 * Note: This is designed to override the JnlpDownloadServlet. I just a little 
 * apprehensive about the licensing if I wrap the (sun) code in an OSGi wrapper. 
 * @author don
 *
 */
public class BundleCacheServlet extends BaseOsgiServlet /*JnlpDownloadServlet*/
{
	private static final long serialVersionUID = 1L;
	public static boolean DEBUG = false;

    Date lastBundleChange = null;
    BundleChangeListener listener = null;
    public class BundleChangeListener implements BundleListener
    {
    	BundleCacheServlet servlet = null;
        public BundleChangeListener(BundleCacheServlet servlet)
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
     * Constructor.
     * @param context
     */
    public void init(Object context, String servicePid, Dictionary<String, Object> properties) {
    	super.init(context, servicePid, properties);
    	
        lastBundleChange = new Date();
    	listener = new BundleChangeListener(this);
    	this.getBundleContext().addBundleListener(listener);
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
     * Convenience method.
     * Note: You will have to cast the class or override this in your actual OSGi servlet.
     */
    public BundleContext getBundleContext()
    {
        return (BundleContext)super.getBundleContext();
    }
    /**
     * If there have not been any bundle changes, return the cached jnlp file.
     * @param request
     * @param file to check
     * @return true if removed (stale)
     */
    public boolean removeCacheFileIfStale(HttpServletRequest request, File file) throws IOException
    {
        if (!file.exists())
            return true;
        Date lastModified = new Date(file.lastModified());
        if ((lastBundleChange == null)
            || (lastBundleChange.after(lastModified)))
                return file.delete();
        return false;   // File is not stale
    }
    /**
     * If there have not been any bundle changes, return the cached jnlp file.
     * @param request
     * @param response
     * @return true if send a response
     * @throws IOException
     */
    public boolean sendCacheIfCurrent(HttpServletRequest request, HttpServletResponse response, File file) throws IOException
    {
        if (!file.exists())
            return false;
        Date lastModified = new Date(file.lastModified());
        if ((lastBundleChange == null)
            || (lastBundleChange.after(lastModified)))
                return false;
        return checkCacheAndSend(request, response, file, false, true);
    }
    /**
     * Return http response that the cache file is up-to-date.
     * @param request
     * @param response
     * @return
     * @throws IOException
     */
    public boolean checkCacheAndSend(HttpServletRequest request, HttpServletResponse response, File file, boolean checkFileDate, boolean jnlpFile) throws IOException
    {
        if ((file == null) || (!file.exists()))
            return false;   // Error - cache doesn't exist
        
        if (!hasFileChanged(request, file, false))
        {   // Not modified since last time
            response.setHeader(LAST_MODIFIED, request.getHeader(IF_MODIFIED_SINCE));
            response.sendError(HttpServletResponse.SC_NOT_MODIFIED);
            return true;    // Success - use your cached copy
        }
        
        Date lastModified = new Date(file.lastModified());
        response.addHeader(LAST_MODIFIED, getHttpDate(lastModified));

        String newCodebase = null;
        if (jnlpFile)
            newCodebase = fixCachedFile(request, file);
        if (newCodebase == null)
        {
            InputStream inStream = new FileInputStream(file);   // If they want it again, send them my cached copy
            OutputStream writer = response.getOutputStream();
            copyStream(inStream, writer, true); // Ignore errors, as browsers do weird things
            inStream.close();
//            writer.close();   // Don't close http connection
            if (DEBUG)
                if (jnlpFile)
                    debugWriteStream(new FileInputStream(file));
        }
        else
        {
            Reader inStream = new StringReader(newCodebase);
            Writer writer = response.getWriter();
            copyStream(inStream, writer, true); // Ignore errors, as browsers do weird things
            inStream.close();
//            writer.close();   // Don't close http connection
            if (DEBUG)
                debugWriteStream(new StringReader(newCodebase));
        }
        if (checkFileDate)
        {
            if ((lastBundleChange != null)
                && (lastBundleChange.after(lastModified)))
                    file.setLastModified(lastBundleChange.getTime());   // Make sure this file is up-to-date for the next checkBundleChanges call
            return true;   // I returned the cached jnlp or a cache up-to-date response
        }
        return true;    // Success - I returned the cached copy
    }
    /**
     * Does this cached file contain the same codebase?
     * If not, fix the codebase and return the new jnlp string.
     * If so, return null.
     * @param request
     * @param file
     * @return
     */
    public String fixCachedFile(HttpServletRequest request, File file)
    {
        return null;	// Override this to change
    }
    /**
     * Is the cache file up-to-date.
     * @param request
     * @param jnlpBaseCacheFile
     * @return CURRENT - Same as last http request, UNCHANGED since last request (from other client?), DIRTY - changed
     */
    public boolean hasFileChanged(HttpServletRequest request, File jnlpBaseCacheFile, boolean checkBundleChanges)
    {
        if ((jnlpBaseCacheFile == null) || (!jnlpBaseCacheFile.exists()))
            return true;   // Cache doesn't exist
        Date lastModified = new Date(jnlpBaseCacheFile.lastModified());
        String requestIfModifiedSince = request.getHeader(IF_MODIFIED_SINCE);
        try {
            if (requestIfModifiedSince != null) 
            {
                Date requestDate = getDateFromHttpDate(requestIfModifiedSince);
                if (!requestDate.before(lastModified))
                    return false;   // Not modified since last time
            }
        } catch (ParseException e) {
            // Fall through
        }
        if (!checkBundleChanges)
        	return true;	// The http cache is out-of-date
    	if ((lastBundleChange == null)
    			|| (lastBundleChange.after(lastModified)))
            return true;       // Jnlp file has definitely changed
        return false;  // Bundles haven't changed since jnlp was last set up
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
     
    public void debugWriteStream(InputStream inStream) throws IOException
    {
        copyStream(inStream, System.out, true); // Ignore errors, as browsers do weird things                
    }
    public void debugWriteStream(Reader inStream) throws IOException
    {
        Writer writer = new OutputStreamWriter(System.out);
        copyStream(inStream, writer, true); // Ignore errors, as browsers do weird things                
    }
}
