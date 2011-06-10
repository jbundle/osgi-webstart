package org.jbundle.util.osgi.jnlp;

/**
 * Start up the web service listener.
 * @author don
 */
public class HttpServiceActivator extends org.jbundle.util.webapp.osgi.HttpServiceActivator
{
    public String getServletClass()
    {
        return OsgiJnlpServlet.class.getName();
    }
}