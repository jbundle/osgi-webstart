/*
 * Copyright © 2012 jbundle.org. All rights reserved.
 */
package org.jbundle.util.osgi.webstart.util;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Basic utilities.
 * Note: These utilities have no external dependencies so potential users can
 * include them in their osgi-webstart javascript wrapped code.
 */
public class UrlUtil extends Object
{	
    public static final String BLANK = "";  // Blank String
    public final static String URL_ENCODING = "UTF-8";

    /**
     * Add this param and data to this URL.
     * @param strOldURL The original URL to add this param to.
     * @param strParam The parameter to add.
     * @param strData The data this parameter is set to.
     * @return The new URL string.
     */
    public static String addURLParam(String strOldURL, String strParam, String strData)
    {
        return UrlUtil.addURLParam(strOldURL, strParam, strData, true);
    }
    /**
     * Add this param and data to this URL.
     * @param strOldURL The original URL to add this param to.
     * @param strParam The parameter to add.
     * @param strData The data this parameter is set to.
     * @param bAddIfNull Add an empty param if the data is null?
     * @return The new URL string.
     */
    public static String addURLParam(String strOldURL, String strParam, String strData, boolean bAddIfNull)
    {
        String strURL = strOldURL;
        if ((strOldURL == null) || (strOldURL.length() == 0))
            strURL = "?";
        else if (strOldURL.indexOf('?') == -1)
            strURL += "?";
        else
            strURL += "&";
        if (strData == null)
        {
            if (!bAddIfNull)
                return strOldURL; // Don't add a null param.
            strData = BLANK;
        }
        try {
            strURL += URLEncoder.encode(strParam, URL_ENCODING) + '=' + URLEncoder.encode(strData, URL_ENCODING);
        } catch (java.io.UnsupportedEncodingException ex) {
            ex.printStackTrace();
        }
        return strURL;
    }
    /**
     * Parse this URL formatted string into properties.
     * @properties The properties object to add the params to.
     * @args The arguments to parse (each formatted as key=value).
     */
    public static Map<String,Object> parseArgs(Map<String,Object> properties, String[] args)
    {
        if (args == null)
            return properties;
        if (properties == null)
        	properties = new HashMap<String,Object>();
        for (int i = 0; i < args.length; i++)
            UrlUtil.addParam(properties, args[i], false);
        return properties;
    }
    /**
     * Convert this properties map to a URL.
     * @param properties
     * @return
     */
    public static String propertiesToUrl(Map<String,Object> properties)
    {
        String command = null;
        for (String key : properties.keySet())
        {
            if (properties.get(key) != null)
                command = UrlUtil.addURLParam(command, key, properties.get(key).toString());
        }
        return command;
    }
    /**
     * Parse this URL formatted string into properties.
     * @properties The properties object to add the params to.
     * @args The URL to parse (formatted as: XYZ?key1=value1&key2=value2).
     */
    public static Map<String,Object> parseArgs(Map<String,Object> properties, String strURL)
    {
        if (properties == null)
            properties = new HashMap<String,Object>();
        int iIndex = 0;
        int iStartIndex = strURL.indexOf('?') + 1;  // Start of first param (0 if no ?)
        while ((iIndex = strURL.indexOf('=', iIndex)) != -1)
        {
            int iEndIndex = strURL.indexOf('&', iIndex);
            if (iEndIndex == -1)
                iEndIndex = strURL.length();
            if (iStartIndex < iEndIndex)
                UrlUtil.addParam(properties, strURL.substring(iStartIndex, iEndIndex), true);
            iStartIndex = iEndIndex + 1;
            iIndex++;
        }
        return properties;
    }
    /**
     * Parse the param line and add it to this properties object.
     * (ie., key=value).
     * @properties The properties object to add this params to.
     * @param strParam param line in the format param=value
     */
    public static void addParam(Map<String,Object> properties, String strParams, boolean bDecodeString)
    {
        int iIndex = strParams.indexOf('=');
        int iEndIndex = strParams.length();
        if (iIndex != -1)
        {
            String strParam = strParams.substring(0, iIndex);
            String strValue = strParams.substring(iIndex + 1, iEndIndex);
            if (bDecodeString)
            {
                try {
                    strParam = URLDecoder.decode(strParam, URL_ENCODING);
                    strValue = URLDecoder.decode(strValue, URL_ENCODING);
                } catch (java.io.UnsupportedEncodingException ex) {
                    ex.printStackTrace();
                }
            }
            properties.put(strParam, strValue);
        }
    }
}
