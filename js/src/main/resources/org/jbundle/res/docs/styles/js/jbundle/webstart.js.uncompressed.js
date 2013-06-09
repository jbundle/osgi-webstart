require({cache:{
'jbundle/java':function(){
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

},
'jbundle/back':function(){
define(
		["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/sniff", "dojo/dom", "dojo/dom-construct", "dojo/_base/window", "require"], function(dojo, lang, sniff, dom, domConstruct, baseWindow, require
				) {
	// module:
	//		dojo/back
	// summary:
	//		TODOC

	lang.getObject("back", true, dojo);

/*=====
dojo.back = {
	// summary: Browser history management resources
};
=====*/

	var back = dojo.back,

	// everyone deals with encoding the hash slightly differently

	getHash = back.getHash = function(){
		var h = window.location.hash;
		if(h.charAt(0) == "#"){ h = h.substring(1); }
		return sniff("mozilla") ? h : decodeURIComponent(h);
	},

	setHash = back.setHash = function(h){
		if(!h){ h = ""; }
		window.location.hash = encodeURIComponent(h);
		historyCounter = history.length;
	};

	var initialHref = (typeof(window) !== "undefined") ? window.location.href : "";
	var initialHash = (typeof(window) !== "undefined") ? getHash() : "";
	var initialState = null;

	var locationTimer = null;
	var bookmarkAnchor = null;
	var historyIframe = null;
	var forwardStack = [];
	var historyStack = [];
	var moveForward = false;
	var changingUrl = false;
	var historyCounter;

	function handleBackButton(){
		//summary: private method. Do not call this directly.

		//The "current" page is always at the top of the history stack.
		var current = historyStack.pop();
		if(!current){ return; }
		var last = historyStack[historyStack.length-1];
		if(!last && historyStack.length == 0){
			last = initialState;
		}
		if(last){
			if(last.kwArgs["back"]){
				last.kwArgs["back"]();
			}else if(last.kwArgs["backButton"]){
				last.kwArgs["backButton"]();
			}else if(last.kwArgs["handle"]){
				last.kwArgs.handle("back");
			}
		}
		forwardStack.push(current);
	}

	back.goBack = handleBackButton;

	function handleForwardButton(){
		//summary: private method. Do not call this directly.
		var last = forwardStack.pop();
		if(!last){ return; }
		if(last.kwArgs["forward"]){
			last.kwArgs.forward();
		}else if(last.kwArgs["forwardButton"]){
			last.kwArgs.forwardButton();
		}else if(last.kwArgs["handle"]){
			last.kwArgs.handle("forward");
		}
		historyStack.push(last);
	}

	back.goForward = handleForwardButton;

	function createState(url, args, hash){
		//summary: private method. Do not call this directly.
		return {"url": url, "kwArgs": args, "urlHash": hash};	//Object
	}

	function getUrlQuery(url){
		//summary: private method. Do not call this directly.
		var segments = url.split("?");
		if(segments.length < 2){
			return null; //null
		}
		else{
			return segments[1]; //String
		}
	}

	function loadIframeHistory(){
		//summary: private method. Do not call this directly.
		var url = (dojo.config["dojoIframeHistoryUrl"] || require.toUrl("./resources/iframe_history.html")) + "?" + (new Date()).getTime();
		moveForward = true;
		if(historyIframe){
			sniff("webkit") ? historyIframe.location = url : window.frames[historyIframe.name].location = url;
		}else{
			//console.warn("dojo.back: Not initialised. You need to call dojo.back.init() from a <script> block that lives inside the <body> tag.");
		}
		return url; //String
	}

	function checkLocation(){
		if(!changingUrl){
			var hsl = historyStack.length;

			var hash = getHash();

			if((hash === initialHash||window.location.href == initialHref)&&(hsl == 1)){
				// FIXME: could this ever be a forward button?
				// we can't clear it because we still need to check for forwards. Ugg.
				// clearInterval(this.locationTimer);
				handleBackButton();
				return;
			}

			// first check to see if we could have gone forward. We always halt on
			// a no-hash item.
			if(forwardStack.length > 0){
				if(forwardStack[forwardStack.length-1].urlHash === hash){
					handleForwardButton();
					return;
				}
			}

			// ok, that didn't work, try someplace back in the history stack
			if((hsl >= 2)&&(historyStack[hsl-2])){
				if(historyStack[hsl-2].urlHash === hash){
					handleBackButton();
				}
			}
		}
	}

	back.init = function(){
		//summary: Initializes the undo stack. This must be called from a <script>
		//		   block that lives inside the <body> tag to prevent bugs on IE.
		// description:
		//		Only call this method before the page's DOM is finished loading. Otherwise
		//		it will not work. Be careful with xdomain loading or djConfig.debugAtAllCosts scenarios,
		//		in order for this method to work, dojo.back will need to be part of a build layer.

		// prevent reinit
		if(dom.byId("dj_history")){ return; } 

		var src = dojo.config["dojoIframeHistoryUrl"] || require.toUrl("./resources/iframe_history.html");
		if (dojo._postLoad) {
			console.error("dojo.back.init() must be called before the DOM has loaded. "
						+ "If using xdomain loading or djConfig.debugAtAllCosts, include dojo.back "
						+ "in a build layer.");
		} else {
//			document.write('<iframe style="border:0;width:1px;height:1px;position:absolute;visibility:hidden;bottom:0;right:0;" name="dj_history" id="dj_history" src="' + src + '"></iframe>');
			var body = document.getElementsByTagName('body');
			if (body.length > 0)
			{
				var iframe = document.createElement('iframe');
				iframe.setAttribute('style', 'border:0;width:1px;height:1px;position:absolute;visibility:hidden;bottom:0;right:0;');
				iframe.setAttribute('name', 'dj_history');
				iframe.setAttribute('id', 'dj_history');
				iframe.setAttribute('src', src);
				body[0].appendChild(iframe);
			}
		}
	};

	back.setInitialState = function(/*Object*/args){
		//summary:
		//		Sets the state object and back callback for the very first page
		//		that is loaded.
		//description:
		//		It is recommended that you call this method as part of an event
		//		listener that is registered via dojo.addOnLoad().
		//args: Object
		//		See the addToHistory() function for the list of valid args properties.
		initialState = createState(initialHref, args, initialHash);
	};

	//FIXME: Make these doc comments not be awful. At least they're not wrong.
	//FIXME: Would like to support arbitrary back/forward jumps. Have to rework iframeLoaded among other things.
	//FIXME: is there a slight race condition in moz using change URL with the timer check and when
	//		 the hash gets set? I think I have seen a back/forward call in quick succession, but not consistent.


	/*=====
	dojo.__backArgs = function(kwArgs){
		// back: Function?
		//		A function to be called when this state is reached via the user
		//		clicking the back button.
		//	forward: Function?
		//		Upon return to this state from the "back, forward" combination
		//		of navigation steps, this function will be called. Somewhat
		//		analgous to the semantic of an "onRedo" event handler.
		//	changeUrl: Boolean?|String?
		//		Boolean indicating whether or not to create a unique hash for
		//		this state. If a string is passed instead, it is used as the
		//		hash.
	}
	=====*/

	back.addToHistory = function(/*dojo.__backArgs*/ args){
		//	summary:
		//		adds a state object (args) to the history list.
		//	args: dojo.__backArgs
		//		The state object that will be added to the history list.
		//	description:
		//		To support getting back button notifications, the object
		//		argument should implement a function called either "back",
		//		"backButton", or "handle". The string "back" will be passed as
		//		the first and only argument to this callback.
		//
		//		To support getting forward button notifications, the object
		//		argument should implement a function called either "forward",
		//		"forwardButton", or "handle". The string "forward" will be
		//		passed as the first and only argument to this callback.
		//
		//		If you want the browser location string to change, define "changeUrl" on the object. If the
		//		value of "changeUrl" is true, then a unique number will be appended to the URL as a fragment
		//		identifier (http://some.domain.com/path#uniquenumber). If it is any other value that does
		//		not evaluate to false, that value will be used as the fragment identifier. For example,
		//		if changeUrl: 'page1', then the URL will look like: http://some.domain.com/path#page1
		//
		//		There are problems with using dojo.back with semantically-named fragment identifiers
		//		("hash values" on an URL). In most browsers it will be hard for dojo.back to know
		//		distinguish a back from a forward event in those cases. For back/forward support to
		//		work best, the fragment ID should always be a unique value (something using new Date().getTime()
		//		for example). If you want to detect hash changes using semantic fragment IDs, then
		//		consider using dojo.hash instead (in Dojo 1.4+).
		//
		//	example:
		//		|	dojo.back.addToHistory({
		//		|		back: function(){ console.log('back pressed'); },
		//		|		forward: function(){ console.log('forward pressed'); },
		//		|		changeUrl: true
		//		|	});

		//	BROWSER NOTES:
		//	Safari 1.2:
		//	back button "works" fine, however it's not possible to actually
		//	DETECT that you've moved backwards by inspecting window.location.
		//	Unless there is some other means of locating.
		//	FIXME: perhaps we can poll on history.length?
		//	Safari 2.0.3+ (and probably 1.3.2+):
		//	works fine, except when changeUrl is used. When changeUrl is used,
		//	Safari jumps all the way back to whatever page was shown before
		//	the page that uses dojo.undo.browser support.
		//	IE 5.5 SP2:
		//	back button behavior is macro. It does not move back to the
		//	previous hash value, but to the last full page load. This suggests
		//	that the iframe is the correct way to capture the back button in
		//	these cases.
		//	Don't test this page using local disk for MSIE. MSIE will not create
		//	a history list for iframe_history.html if served from a file: URL.
		//	The XML served back from the XHR tests will also not be properly
		//	created if served from local disk. Serve the test pages from a web
		//	server to test in that browser.
		//	IE 6.0:
		//	same behavior as IE 5.5 SP2
		//	Firefox 1.0+:
		//	the back button will return us to the previous hash on the same
		//	page, thereby not requiring an iframe hack, although we do then
		//	need to run a timer to detect inter-page movement.

		//If addToHistory is called, then that means we prune the
		//forward stack -- the user went back, then wanted to
		//start a new forward path.
		forwardStack = [];

		var hash = null;
		var url = null;
		if(!historyIframe){
			if(dojo.config["useXDomain"] && !dojo.config["dojoIframeHistoryUrl"]){
				console.warn("dojo.back: When using cross-domain Dojo builds,"
					+ " please save iframe_history.html to your domain and set djConfig.dojoIframeHistoryUrl"
					+ " to the path on your domain to iframe_history.html");
			}
			historyIframe = window.frames["dj_history"];
		}
		if(!bookmarkAnchor){
			bookmarkAnchor = domConstruct.create("a", {style: {display: "none"}}, baseWindow.body());
		}
		if(args["changeUrl"]){
			hash = ""+ ((args["changeUrl"]!==true) ? args["changeUrl"] : (new Date()).getTime());

			//If the current hash matches the new one, just replace the history object with
			//this new one. It doesn't make sense to track different state objects for the same
			//logical URL. This matches the browser behavior of only putting in one history
			//item no matter how many times you click on the same #hash link, at least in Firefox
			//and Safari, and there is no reliable way in those browsers to know if a #hash link
			//has been clicked on multiple times. So making this the standard behavior in all browsers
			//so that dojo.back's behavior is the same in all browsers.
			if(historyStack.length == 0 && initialState.urlHash == hash){
				initialState = createState(url, args, hash);
				return;
			}else if(historyStack.length > 0 && historyStack[historyStack.length - 1].urlHash == hash){
				historyStack[historyStack.length - 1] = createState(url, args, hash);
				return;
			}

			changingUrl = true;
			setTimeout(function() {
					setHash(hash);
					changingUrl = false;
				}, 1);
			bookmarkAnchor.href = hash;

			/*if(sniff("ie")){
				url = loadIframeHistory();

				var oldCB = args["back"]||args["backButton"]||args["handle"];

				//The function takes handleName as a parameter, in case the
				//callback we are overriding was "handle". In that case,
				//we will need to pass the handle name to handle.
				var tcb = function(handleName){
					if(getHash() != ""){
						setTimeout(function() { setHash(hash); }, 1);
					}
					//Use apply to set "this" to args, and to try to avoid memory leaks.
					oldCB.apply(this, [handleName]);
				};

				//Set interceptor function in the right place.
				if(args["back"]){
					args.back = tcb;
				}else if(args["backButton"]){
					args.backButton = tcb;
				}else if(args["handle"]){
					args.handle = tcb;
				}

				var oldFW = args["forward"]||args["forwardButton"]||args["handle"];

				//The function takes handleName as a parameter, in case the
				//callback we are overriding was "handle". In that case,
				//we will need to pass the handle name to handle.
				var tfw = function(handleName){
					if(getHash() != ""){
						setHash(hash);
					}
					if(oldFW){ // we might not actually have one
						//Use apply to set "this" to args, and to try to avoid memory leaks.
						oldFW.apply(this, [handleName]);
					}
				};

				//Set interceptor function in the right place.
				if(args["forward"]){
					args.forward = tfw;
				}else if(args["forwardButton"]){
					args.forwardButton = tfw;
				}else if(args["handle"]){
					args.handle = tfw;
				}

			}else if(!sniff("ie"))*/{
				// start the timer
				if(!locationTimer){
					locationTimer = setInterval(checkLocation, 200);
				}

			}
		}else{
			url = loadIframeHistory();
		}

		historyStack.push(createState(url, args, hash));
	};

	back._iframeLoaded = function(evt, ifrLoc){
		//summary:
		//		private method. Do not call this directly.
		var query = getUrlQuery(ifrLoc.href);
		if(query == null){
			// alert("iframeLoaded");
			// we hit the end of the history, so we should go back
			if(historyStack.length == 1){
				handleBackButton();
			}
			return;
		}
		if(moveForward){
			// we were expecting it, so it's not either a forward or backward movement
			moveForward = false;
			return;
		}

		//Check the back stack first, since it is more likely.
		//Note that only one step back or forward is supported.
		if(historyStack.length >= 2 && query == getUrlQuery(historyStack[historyStack.length-2].url)){
			handleBackButton();
		}else if(forwardStack.length > 0 && query == getUrlQuery(forwardStack[forwardStack.length-1].url)){
			handleForwardButton();
		}
	};

	return dojo.back;
	
});

},
'jbundle/thinutil':function(){
/**
 * Base utilities.
 */
define([
], function(){
    return {
	/**
	 * Convert this properties object to a command.
	 */
	propertiesToCommand: function(properties)
	{
		var command = "?";
		if (properties)
		{
			if (typeof(properties) == 'string')
				if (properties.length > 1)
				{
					if (!properties.substring(0, 1) != "(")
						properties = "(" + properties + ")";
					properties = eval(properties);
				}
			for (var name in properties)
			{
				if (command.length > 1)
					command += "&";
				command += name + "=" + escape(properties[name]);
			}
		}
		return command;
	},
	/**
	 * Convert this command string to a properties object.
	 */
	commandToProperties: function(command, properties)
	{
		if (!properties)
			properties = {};
		var commandArray = command.split(/[;&?]/);
		for (var i = 0; i < commandArray.length; i++)
		{
			var thisCommand = commandArray[i];
			while ((thisCommand.charAt(0) == ' ') || (thisCommand.charAt(0) == '?'))
				thisCommand = thisCommand.substring(1, thisCommand.length);
			var equals = thisCommand.indexOf('=');
			if (equals != -1)	// Always
				properties[thisCommand.substring(0, equals)] = unescape(thisCommand.substring(equals+1, thisCommand.length));
		}
		return properties;
	},
	/**
	 * Get this property from this command string.
	 */
	getProperty: function(command, key)
	{
		var nameEQ = key.toUpperCase() + "=";
		if (command == null)
			return null;
		if (command.indexOf("?") != -1)
			if ((command.indexOf("?") < command.indexOf("&") || (command.indexOf("&") == -1)))
				command = command.substring(command.indexOf("?") + 1);
		var ca = command.split(/[;&]/);
		for (var i = 0; i < ca.length; i++)
		{
			var c = ca[i];
			while ((c.charAt(0) == ' ') || (c.charAt(0) == '?'))
				c = c.substring(1, c.length);
			if (c.toUpperCase().indexOf(nameEQ) == 0)
				return unescape(c.substring(nameEQ.length, c.length));
		}
		return null;
	},
	/**
	 * Remove the hash mark.
	 */
	getCommandFromHash: function(hash)
	{
		if (hash)
			if (hash.length > 0)
		{
			hash = unescape(hash);
			if (hash.substring(0, 1) == '#')
				hash = hash.substring(1);
		}
		return hash;
	},
	/**
	 * Utility - Remove all children from this node.
	 */
	removeChildren: function(dom, removeFromParent)
	{
		if (dom.nodeType == 1)	// Node.ELEMENT_NODE)
		{
			if (dom.getAttribute("widgetid"))
			{	// TODO (don) - Fix this to use dom.destroy();
				if (removeFromParent)
				{
		    		require(["dijit/registry"], function(registry) {
						if (registry.byId(dom.getAttribute("widgetid")))
						{
							registry.byId(dom.getAttribute("widgetid")).destroyRecursive();
							removeFromParent = false;	// Previous command removed it.
						}
	//					dijit.util.manager.remove(dom.getAttribute("widgetid"));	// dojo destroy
		    		});
				}
			}
			var children = dom.childNodes;
			for (var i = children.length-1; i >= 0; i--)
			{
				this.removeChildren(children[i], true);
			}
		}
		if (removeFromParent)
			dom.parentNode.removeChild(dom);
	},
  };
});

}}});
/**
 * This is the top-level module that includes the java-plugin jbundle modules.
 * Just include this module and call the init method.
 * This module is combined with all the others for deployment.
 * This is different from the jbundle module in that it does not include
 * the (very large) dojo dijit and parser libraries.
 */

define("jbundle/webstart", [
	"jbundle/java",
	"jbundle/back",
	"dojo/domReady!"
	], function(main, back){
    return {
	init: function()
	{
		main.init();
	},
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    runAppletWithCommand: function(command, hash, version) {
    		main.runAppletWithCommand(command, hash, version);
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     * NOTE: This method only works with the gui code.
     */
    getAppletWithCommand: function(command, hash, version) {
    	return main.getAppletWithCommand(command, hash, version);
    },
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    writeAppletTag: function(attributes, parameters) {
    	return main.writeAppletTag(attributes, parameters);
    }
  };
});
