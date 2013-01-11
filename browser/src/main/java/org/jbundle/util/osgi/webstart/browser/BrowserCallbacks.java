/*
 * BrowserCallbacks.java
 *
 * Created on January 8, 2012, 12:14 AM
 * Copyright © 2012 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart.browser;

/** 
 * BrowserCallbacks - The methods that are called from javascript.
 * @author  Don Corley don@tourgeek.com
 * @version 1.0.0
 */
public interface BrowserCallbacks
{
    /**
     * The browser back button was pressed (Javascript called me).
     * @param command The command that was popped from the browser history.
     */
    public void doJavaBrowserBack(String command);
    /**
     * The browser back button was pressed (Javascript called me).
     * @param command The command that was popped from the browser history.
     */
    public void doJavaBrowserForward(String command);
    /**
     * The browser hash value changed (Javascript called me).
     * @param command The command that was popped from the browser history.
     */
    public void doJavaBrowserHashChange(String command);
}
