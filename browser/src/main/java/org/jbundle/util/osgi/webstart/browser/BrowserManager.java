/*
 * MuffinManager.java
 *
 * Created on January 30, 2001, 12:14 AM
 
 * Copyright © 2012 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart.browser;

import java.applet.Applet;
import java.util.HashMap;
import java.util.Map;

import netscape.javascript.JSObject;

import org.jbundle.util.osgi.webstart.util.UrlUtil;

/** 
 * BrowserManager - This code handles the browser interface for the java web start program.
 * Note: These utilities have no external dependencies so potential users can
 * include them in their osgi-webstart javascript wrapped code.
 * @author  Don Corley don@tourgeek.com
 * @version 1.0.0
 */
public class BrowserManager extends Object
{
	private Applet m_applet = null;
	
	protected Map<String,Object> m_propertiesInitialCommand = null;
	
    public static final String BLANK = "";  // Blank String

    /**
     * Creates new BrowserManager.
     */
    public BrowserManager()
    {
        super();
    }
    /**
     * Creates new BrowserManager.
     * @param applet The applet object.
     * @param strInitialCommand The initial command params
     */
    public BrowserManager(Applet applet, Map<String,Object> mapInitialCommands)
    {
        this();
        this.init(applet, mapInitialCommands);
    }
    /**
     * Creates new MuffinManager.
     * @param applet The applet object.
     */
    public void init(Applet applet, Map<String,Object> mapInitialCommands)
    {
    	m_applet = applet;
		m_propertiesInitialCommand = mapInitialCommands;
    }
    /**
     * Push this command onto the browser's history stack.
     * @param command
     */
	public void pushBrowserHistory(String command, String title)
	{
        String args[] = new String[2];
        args[0] = this.getCommandForBrowser(command);
    	if (title == null)
    		title = BLANK;
        args[1] = title;
        //logger.info("pushBrowserHistory command: " + args[0] + " title " + args[1]);
        this.callJavascript("pushBrowserHistory", args);
	}
	/**
	 * Given this command, return the full command in an array of 1.
	 * @param command
	 * @return
	 */
	public String getCommandForBrowser(String command)
	{
        if ((command != null) || (m_propertiesInitialCommand != null))
        {
    		Map<String,Object> properties = new HashMap<String,Object>();
    		if (m_propertiesInitialCommand != null)
    			properties.putAll(m_propertiesInitialCommand);
        	if (command != null)
        		UrlUtil.parseArgs(properties, command);	// Note - duplicates will go with this version
    		command = BLANK;
    		for (String key : properties.keySet())
    		{
    			if (("samewindow".equalsIgnoreCase(key))
        			|| ("navmenus".equalsIgnoreCase(key))
    				|| ("menubars".equalsIgnoreCase(key)))
    					continue;
    			if (properties.get(key) == null)
    				properties.put(key, BLANK);
    			command = UrlUtil.addURLParam(command, key, properties.get(key).toString());
    		}
        }
        return command;
	}
	/**
	 * Pop some commands from the browser's history.
	 * Note: The browser will NOT call your java doBack method, you need to do the navigation yourself.
	 * Note: If you pop more commands than you have on the stack, the browser will back up
	 * into it's html page history and display the target web page.
	 * @param commandsToPop The number of commands to pop from the history.
	 */
	public void popBrowserHistory(int commandsToPop, boolean bCommandHandledByJava, String title)
	{
        String args[] = new String[3];
    	args[0] = Integer.toString(commandsToPop);
    	args[1] = Boolean.toString(bCommandHandledByJava);
    	if (title == null)
    		title = BLANK;
        args[2] = title;
        //logger.info("popBrowserHistory commandsToPop: " + args[0] + " handledByJava: " + args[1] + " title: " + args[2]);
        this.callJavascript("popBrowserHistory", args);
	}
	/**
	 * Display this web page in browser.
	 * Note: If this is successful, this applet will not be running anymore.
	 * @param url
	 */
	public void doLink(String url)
	{
        String args[] = new String[1];
        args[0] = url;
        //logger.info("doLink command: " + args[0]);
        this.callJavascript("doLink", args);	    
	}
	/**
	 * Call javascript with this command.
	 * @param command
	 * @param args
	 */
	public Object callJavascript(String command, String args[])
	{
		try {
	        JSObject win = JSObject.getWindow(m_applet);
	        return win.call(command, args);
		} catch (Exception ex) {
			return null; // Ignore any errors
		}		
	}
}
