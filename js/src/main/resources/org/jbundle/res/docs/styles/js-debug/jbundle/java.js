/**
 * For java to call these, these must be at the root.
 */
function pushBrowserHistory(command, title)
{
	require(['jbundle/java', 'dojo/domReady!'], function(java) {
	 java.pushBrowserHistory(command, title);
	});
}
function popBrowserHistory(count, commandHandledByClient, title)
{
	require(['jbundle/java', 'dojo/domReady!'], function(java) {
	 java.popBrowserHistory(count, commandHandledByClient, title);
	});
}

/**
 * Browser back support.
 * Note: java.js has minimal dependencies, and no dijit or parser dependencies to keep code small.
 */
define([
	"jbundle/thinutil",
	"jbundle/back",
	"dojo/_base/declare",
//	"dojo/domReady!",
], function(thinutil, back, declare) {
    return {

	/**
	 * The state object.
	 * Note: The Url hash is the command
	 */
    State:
		declare(null, {
			// The constructor
			constructor: function(command, java) {
				this.changeUrl = command;
				this.java = java;
			},
			back: function(data) {
				this.java.doBack(this.changeUrl);
			},

			forward: function() {
				this.java.doForward(this.changeUrl);
			}
	}),

	// Initialize environment
	init: function()
	{	// Push initial history
		back.setInitialState(new this.State(thinutil.getCommandFromHash(window.location.hash), this));
	},

    SERVLET_NAME: "webstart",          // The default servlet name.
	/**
	 * This is called from the history state object when the state is popped by a browser back command.
	 * This method calls TO the java doBack method.
	 * @param command Is the command popped off the history stack that java should execute.
	 */
	doBack: function(command)
	{
		if (!this.isJavaWindow())
			this.displayApplet(command);
		if (this.ignoreBack != true)
		{
			if (document.jbundle)
				document.jbundle.doBack(command);
			if (dojoConfig.isDebug == true)
				console.log("doBack command =" + command);
		}
		this.ignoreBack = false;
	},
	/**
	 * This is called from the history state object when the state is popped by a browser forward command.
	 * This method calls TO the java doForward method.
	 * @param command Is the command popped off the history stack that java should execute.
	 */
	doForward: function(command)
	{
		if (!this.isJavaWindow())
			this.displayApplet(command);
		else if (document.jbundle)
			document.jbundle.doForward(command);
		if (dojoConfig.isDebug == true)
			console.log("doForward command =" + command);
	},
	/**
	 * This is called from the history state object when the state is popped by a browser hash change.
	 * This method calls TO the java hashChange method.
	 * @param command Is the command in the new hash that java should execute.
	 */
	hashChange: function(command)
	{
		if (thinutil.getProperty(command, "applet") == null)
		{
			if (this.isJavaWindow())
				this.prepareWindowForApplet(false);
//+			util.doCommand(command);
			return;
		}
		if (!this.isJavaWindow())
			this.displayApplet(command);
		else if (document.jbundle)
			document.jbundle.hashChange(command);
		else if (util)
		{	// Must be an xsl command
			this.prepareWindowForApplet(false);
//+			util.doBrowserHashChange(command);
		}
		if (dojoConfig.isDebug == true)
			console.log("hashChange command =" + command);
	},
	/**
	 * This is called FROM java to push a history object onto the stack.
	 * @param command Is the command to be pushed onto the history stack.
	 */
	pushBrowserHistory: function(command, title)
	{
		if (back)
			back.addToHistory(new this.State(command, this));
		if (title)
			document.title = title;
		if (dojoConfig.isDebug == true)
			console.log("pushBrowserHistory command =" + command + " title= " + title);
	},
	/**
	 * This is called FROM java to pop history object(s) from the stack.
	 * Note: The global variable ignoreBack keeps me from notifying java of the change in the page.
	 * @param count Is the number of commands to pop from the stack.
	 * @param commandHandledByClient If true java already handled it.
	 */
	popBrowserHistory: function(count, commandHandledByClient, title)
	{
		move = 0 - count;
		if ((commandHandledByClient == 'true') || (commandHandledByClient == true))
			this.ignoreBack = true;
		history.go(move);
		if (title)
			document.title = title;
		if (dojoConfig.isDebug == true)
			console.log('popBrowserHistory count =' + count + ' move = ' + move + ' handled = ' + commandHandledByClient + " title= " + title);
	},
	/**
	 * For now - just do the html link.
	 */
	doLink: function(command)
	{
		window.location = command;
	},
	// Display a applet with this command in the content area.
	// Returns true if successful
	// --NOTE-- For this work, you must include deployJava.js in mainstyles-ajax
	displayApplet: function(command, version)
	{
		if (!command)
			return false;
		if (version == null)
			version = '1.6';
		var params = thinutil.commandToProperties(command);

		var domToAppendTo = document.getElementById("content-area");
		// First, delete all the old nodes
		thinutil.removeChildren(domToAppendTo, false);
		// Then, add the new nodes (via xslt)
		//+ var desc = gui.changeTitleFromData(domToBeTransformed);
		var attributes = this.getAppletAttributes(params);
		var jnlp = this.getJnlpURL(attributes, params);
		if (!params.jnlp_href)
			params['jnlp_href'] = jnlp;
		
		this.prepareWindowForApplet(true);
		
		var html = this.getAppletHtml(attributes, params, version);
		domToAppendTo.innerHTML = html;
		this.pushBrowserHistory(command);
		return true;
	},
	// Return true if java applet is displayed
	isJavaWindow: function()
	{
		if (document.body.parentNode)
			if (document.body.parentNode.className)
				return (document.body.parentNode.className == "java");
		return true;	// This is only for tourapp windows
	},
	oldClassName: "",
	// Setup/restore this screen to display this applet
	prepareWindowForApplet: function(flag)
	{
		if (flag == true)
		{
			if (document.body.parentNode.className != "java")
				this.oldClassName = document.body.parentNode.className;
			document.body.parentNode.className="java";	// For firefox html.class
//?			if (gui)
//?				gui.changeTheTitle("Java Window");
		}
		else
		{
		    if (this.oldClassName)
				document.body.parentNode.className=this.oldClassName;
		}
	},
	// Get the applet attributes from the params
	getAppletAttributes: function(params)
	{
		var attributes = {};
		if ((params.applet != null) && (params.applet != 'undefined') && (!params.code))
		{
			params.code = params.applet;
			delete params.applet;
		}
		for (var key in params)
		{
			param = params[key];
			move = false;
			remove = false;
			if (key == 'code')
				move = true;
			if (key == 'codebase')
				move = true;
			if (key == 'name')
				move = true;
			if ((key == 'height') || (key == 'width'))
			{
				move = true;
				remove = true;
			}
			if (move == true)
				attributes[key] = param;
			if (remove == true)
				delete params[key];
		}
		if (!params.domain)
			params.domain = location.hostname;
		if (!params.baseURL)
		{
			params.baseURL = location.host;
			if ((location.pathname.indexOf(this.SERVLET_NAME) < 1) && (location.pathname.indexOf(this.SERVLET_NAME + '/') != 0))
				params.baseURL += "/";
			else
				params.baseURL += location.pathname.substring(0, location.pathname.indexOf(this.SERVLET_NAME));
		}
		if (!params.url)
			params.url = location.protocol + '//' + location.host + location.pathname;
		if (!attributes.codebase)
			attributes.codebase = location.protocol + '//' + params.baseURL;
		if (!attributes.width)
			attributes.width = '100%';
		if (!attributes.height)
			attributes.height = '98%';
		if (!attributes.name)
			attributes.name = 'jbundle';
		if (!params.hash) if (window.location.hash)
		{	// How do I keep from picking up the xsl hash?
//			params.hash = location.hash;
		}
		if (!params.draggable)
			params.draggable = true;
		return attributes;
	},
	// Get the jnlp URL from the params
	getJnlpURL: function(attributes, params)
	{
		var jnlp = {};
		for (var name in params)
		{
			jnlp[name] = params[name];
		}
		jnlp['datatype']='jnlpapplet';
		if (!jnlp.applet)
				if (attributes['code'])
					jnlp['appletClass'] = attributes['code'];
		var command = attributes.codebase + this.SERVLET_NAME + thinutil.propertiesToCommand(jnlp);
		return command;
	},
	// Get this param from the browser url
	getParam: function ( name )
	{ // Thanks netlobo
	  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	  var regexS = "[\\?&]"+name+"=([^&#]*)";
	  var regex = new RegExp( regexS );
	  var results = regex.exec( window.location.href );
	  if( results == null )
	    return "";
	  else
	    return results[1];
	},
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    runAppletWithCommand: function(command, hash, version) {
		if ((hash != null) && (hash.length > 0))
		{
			if (command == null)
				command = "";
			command = command + "&" + thinutil.getCommandFromHash(hash);
		}
		if (!command)
			return false;
		if (version == null)
			version = '1.6';
		var params = thinutil.commandToProperties(command);

		var attributes = this.getAppletAttributes(params);
		var jnlp = this.getJnlpURL(attributes, params);
		if (!params.jnlp_href)
			params['jnlp_href'] = jnlp;
		
		this.prepareWindowForApplet(true);	// Set java flag to 'true'
		deployJava.runApplet(attributes, params, version);
		return true;
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     * NOTE: This method only works with the gui code.
     */
    getAppletWithCommand: function(command, hash, version) {
		if ((hash != null) && (hash.length > 0))
		{
			if (command == null)
				command = "";
			command = command + "&" + thinutil.getCommandFromHash(hash);
		}
		if (!command)
			return false;
		if (version == null)
			version = '1.6';
		var params = thinutil.commandToProperties(command);

		var attributes = this.getAppletAttributes(params);
		var jnlp = this.getJnlpURL(attributes, params);
		if (!params.jnlp_href)
			params['jnlp_href'] = jnlp;
		
		this.prepareWindowForApplet(true);	// Set java flag to 'true'
		return this.getAppletHtml(attributes, params, version);
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     * NOTE: This method only works with the gui code.
     */
    getAppletHtml: function(attributes, parameters, minimumVersion) {
        if (minimumVersion == 'undefined' || minimumVersion == null) {
            minimumVersion = '1.1';
        }

        var regex = "^(\\d+)(?:\\.(\\d+)(?:\\.(\\d+)(?:_(\\d+))?)?)?$";

        var matchData = minimumVersion.match(regex);

        if (deployJava.returnPage == null) {
            // if there is an install, come back here and run the applet
            deployJava.returnPage = document.location;
        }

        if (matchData != null) {
            var browser = deployJava.getBrowser();
            if ((browser != '?') && (browser != 'Safari')) {
                if (deployJava.versionCheck(minimumVersion + '+')) {
                    return this.writeAppletTag(attributes, parameters);
                } else if (deployJava.installJRE(minimumVersion + '+')) {
                    // after successfull install we need to refresh page to pick
                    // pick up new plugin
                    deployJava.refresh();
                    location.href = document.location;
                    return this.writeAppletTag(attributes, parameters);
                }
            } else {
                // for unknown or Safari - just try to show applet
            	return this.writeAppletTag(attributes, parameters);
            }
        } else {
            if (deployJava.debug) {
                alert('Invalid minimumVersion argument to getAppletHtml():' + 
                      minimumVersion);
            }
        }
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     */
    writeAppletTag: function(attributes, parameters) {
        var startApplet = '<' + 'applet ';
        var params = '';
        var endApplet = '<' + '/' + 'applet' + '>';
        var addCodeAttribute = true;

        if (null == parameters || typeof parameters != 'object') {
            parameters = new Object();
        }

        for (var attribute in attributes) {
            if (! this.isValidAppletAttr(attribute)) {
                parameters[attribute] = attributes[attribute];
            } else {
                startApplet += (' ' +attribute+ '="' +attributes[attribute] + '"');
                if (attribute == 'code') {
                    addCodeAttribute = false;
                }
            }
        }

        var codebaseParam = false;
        for (var parameter in parameters) {
            if (parameter == 'codebase_lookup') {
                codebaseParam = true;
            }
            // Originally, parameter 'object' was used for serialized
            // applets, later, to avoid confusion with object tag in IE
            // the 'java_object' was added.  Plugin supports both.
            if (parameter == 'object' || parameter == 'java_object' ||
                parameter == 'java_code' ) {
                addCodeAttribute = false;
            }
            params += '<param name="' + parameter + '" value="' +
                parameters[parameter] + '"/>';
        }
        if (!codebaseParam) {
            params += '<param name="codebase_lookup" value="false"/>';
        }

        if (addCodeAttribute) {
            startApplet += (' code="dummy"');
        }
        startApplet += '>';

        return startApplet + '\n' + params + '\n' + endApplet;
    },
    isValidAppletAttr: function(attr) {
        return this.arHas(this.applet, attr.toLowerCase());
    },
    arHas: function(ar, attr) {
        var len = ar.length;
        for (var i = 0; i < len; i++) {
            if (ar[i] === attr) return true;
        }
        return false;
    },
    applet: [ 'codebase', 'code', 'name', 'archive', 'object',
            'width', 'height', 'alt', 'align', 'hspace', 'vspace' ],
    ignoreBack: false,
  };
});
