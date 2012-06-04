/*
 * Copyright © 2012 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart;

import org.osgi.service.http.HttpContext;

/**
 * Start up the web service listener.
 * @author don
 */
public class HttpServiceActivator extends org.jbundle.util.webapp.base.HttpServiceActivator
{
    public String getServiceClassName()
    {
        return OsgiWebStartServlet.class.getName();
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
