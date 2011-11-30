/*
 * Copyright © 2011 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart;

import org.osgi.framework.BundleContext;
import org.osgi.service.http.HttpContext;

/**
 * Start up the web service listener.
 * @author don
 */
public class HttpServiceActivator extends org.jbundle.util.webapp.base.HttpServiceActivator
{
    public String getServletClass(BundleContext context)
    {
        return OsgiJnlpServlet.class.getName();
    }
    /**
     * Get the Servlet context for this servlet.
     * Override if different from default context.
     * @return The httpcontext.
     */
    public HttpContext getHttpContext()
    {
        return new JnlpHttpContext(context.getBundle());
    }
}
