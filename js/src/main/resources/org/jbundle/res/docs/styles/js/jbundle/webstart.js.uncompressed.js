require({cache:{
'dojo/hash':function(){
define(["./_base/kernel", "require", "./_base/config", "./aspect", "./_base/lang", "./topic", "./domReady", "./sniff"],
	function(dojo, require, config, aspect, lang, topic, domReady, has){

	// module:
	//		dojo/hash

	dojo.hash = function(/* String? */ hash, /* Boolean? */ replace){
		// summary:
		//		Gets or sets the hash string in the browser URL.
		// description:
		//		Handles getting and setting of location.hash.
		//
		//		 - If no arguments are passed, acts as a getter.
		//		 - If a string is passed, acts as a setter.
		// hash:
		//		the hash is set - #string.
		// replace:
		//		If true, updates the hash value in the current history
		//		state instead of creating a new history state.
		// returns:
		//		when used as a getter, returns the current hash string.
		//		when used as a setter, returns the new hash string.
		// example:
		//	|	topic.subscribe("/dojo/hashchange", context, callback);
		//	|
		//	|	function callback (hashValue){
		//	|		// do something based on the hash value.
		//	|	}

		// getter
		if(!arguments.length){
			return _getHash();
		}
		// setter
		if(hash.charAt(0) == "#"){
			hash = hash.substring(1);
		}
		if(replace){
			_replace(hash);
		}else{
			location.href = "#" + hash;
		}
		return hash; // String
	};

	// Global vars
	var _recentHash, _ieUriMonitor, _connect,
		_pollFrequency = config.hashPollFrequency || 100;

	//Internal functions
	function _getSegment(str, delimiter){
		var i = str.indexOf(delimiter);
		return (i >= 0) ? str.substring(i+1) : "";
	}

	function _getHash(){
		return _getSegment(location.href, "#");
	}

	function _dispatchEvent(){
		topic.publish("/dojo/hashchange", _getHash());
	}

	function _pollLocation(){
		if(_getHash() === _recentHash){
			return;
		}
		_recentHash = _getHash();
		_dispatchEvent();
	}

	function _replace(hash){
		if(_ieUriMonitor){
			if(_ieUriMonitor.isTransitioning()){
				setTimeout(lang.hitch(null,_replace,hash), _pollFrequency);
				return;
			}
			var href = _ieUriMonitor.iframe.location.href;
			var index = href.indexOf('?');
			// main frame will detect and update itself
			_ieUriMonitor.iframe.location.replace(href.substring(0, index) + "?" + hash);
			return;
		}
		location.replace("#"+hash);
		!_connect && _pollLocation();
	}

	function IEUriMonitor(){
		// summary:
		//		Determine if the browser's URI has changed or if the user has pressed the
		//		back or forward button. If so, call _dispatchEvent.
		//
		// description:
		//		IE doesn't add changes to the URI's hash into the history unless the hash
		//		value corresponds to an actual named anchor in the document. To get around
		//		this IE difference, we use a background IFrame to maintain a back-forward
		//		history, by updating the IFrame's query string to correspond to the
		//		value of the main browser location's hash value.
		//
		//		E.g. if the value of the browser window's location changes to
		//
		//		#action=someAction
		//
		//		... then we'd update the IFrame's source to:
		//
		//		?action=someAction
		//
		//		This design leads to a somewhat complex state machine, which is
		//		described below:
		//
		//		####s1
		//
		//		Stable state - neither the window's location has changed nor
		//		has the IFrame's location. Note that this is the 99.9% case, so
		//		we optimize for it.
		//
		//		Transitions: s1, s2, s3
		//
		//		####s2
		//
		//		Window's location changed - when a user clicks a hyperlink or
		//		code programmatically changes the window's URI.
		//
		//		Transitions: s4
		//
		//		####s3
		//
		//		Iframe's location changed as a result of user pressing back or
		//		forward - when the user presses back or forward, the location of
		//		the background's iframe changes to the previous or next value in
		//		its history.
		//
		//		Transitions: s1
		//
		//		####s4
		//
		//		IEUriMonitor has programmatically changed the location of the
		//		background iframe, but it's location hasn't yet changed. In this
		//		case we do nothing because we need to wait for the iframe's
		//		location to reflect its actual state.
		//
		//		Transitions: s4, s5
		//
		//		####s5
		//
		//		IEUriMonitor has programmatically changed the location of the
		//		background iframe, and the iframe's location has caught up with
		//		reality. In this case we need to transition to s1.
		//
		//		Transitions: s1
		//
		//		The hashchange event is always dispatched on the transition back to s1.


		// create and append iframe
		var ifr = document.createElement("iframe"),
			IFRAME_ID = "dojo-hash-iframe",
			ifrSrc = config.dojoBlankHtmlUrl || require.toUrl("./resources/blank.html");

		if(config.useXDomain && !config.dojoBlankHtmlUrl){
			console.warn("dojo.hash: When using cross-domain Dojo builds,"
				+ " please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"
				+ " to the path on your domain to blank.html");
		}

		ifr.id = IFRAME_ID;
		ifr.src = ifrSrc + "?" + _getHash();
		ifr.style.display = "none";
		document.body.appendChild(ifr);

		this.iframe = dojo.global[IFRAME_ID];
		var recentIframeQuery, transitioning, expectedIFrameQuery, docTitle, ifrOffline,
			iframeLoc = this.iframe.location;

		function resetState(){
			_recentHash = _getHash();
			recentIframeQuery = ifrOffline ? _recentHash : _getSegment(iframeLoc.href, "?");
			transitioning = false;
			expectedIFrameQuery = null;
		}

		this.isTransitioning = function(){
			return transitioning;
		};

		this.pollLocation = function(){
			if(!ifrOffline){
				try{
					//see if we can access the iframe's location without a permission denied error
					var iframeSearch = _getSegment(iframeLoc.href, "?");
					//good, the iframe is same origin (no thrown exception)
					if(document.title != docTitle){ //sync title of main window with title of iframe.
						docTitle = this.iframe.document.title = document.title;
					}
				}catch(e){
					//permission denied - server cannot be reached.
					ifrOffline = true;
					console.error("dojo.hash: Error adding history entry. Server unreachable.");
				}
			}
			var hash = _getHash();
			if(transitioning && _recentHash === hash){
				// we're in an iframe transition (s4 or s5)
				if(ifrOffline || iframeSearch === expectedIFrameQuery){
					// s5 (iframe caught up to main window or iframe offline), transition back to s1
					resetState();
					_dispatchEvent();
				}else{
					// s4 (waiting for iframe to catch up to main window)
					setTimeout(lang.hitch(this,this.pollLocation),0);
					return;
				}
			}else if(_recentHash === hash && (ifrOffline || recentIframeQuery === iframeSearch)){
				// we're in stable state (s1, iframe query == main window hash), do nothing
			}else{
				// the user has initiated a URL change somehow.
				// sync iframe query <-> main window hash
				if(_recentHash !== hash){
					// s2 (main window location changed), set iframe url and transition to s4
					_recentHash = hash;
					transitioning = true;
					expectedIFrameQuery = hash;
					ifr.src = ifrSrc + "?" + expectedIFrameQuery;
					ifrOffline = false; //we're updating the iframe src - set offline to false so we can check again on next poll.
					setTimeout(lang.hitch(this,this.pollLocation),0); //yielded transition to s4 while iframe reloads.
					return;
				}else if(!ifrOffline){
					// s3 (iframe location changed via back/forward button), set main window url and transition to s1.
					location.href = "#" + iframeLoc.search.substring(1);
					resetState();
					_dispatchEvent();
				}
			}
			setTimeout(lang.hitch(this,this.pollLocation), _pollFrequency);
		};
		resetState(); // initialize state (transition to s1)
		setTimeout(lang.hitch(this,this.pollLocation), _pollFrequency);
	}
	domReady(function(){
		if("onhashchange" in dojo.global && (!has("ie") || (has("ie") >= 8 && document.compatMode != "BackCompat"))){	//need this IE browser test because "onhashchange" exists in IE8 in IE7 mode
			_connect = aspect.after(dojo.global,"onhashchange",_dispatchEvent, true);
		}else{
			if(document.addEventListener){ // Non-IE
				_recentHash = _getHash();
				setInterval(_pollLocation, _pollFrequency); //Poll the window location for changes
			}else if(document.attachEvent){ // IE7-
				//Use hidden iframe in versions of IE that don't have onhashchange event
				_ieUriMonitor = new IEUriMonitor();
			}
			// else non-supported browser, do nothing.
		}
	});

	return dojo.hash;

});

},
'jbundle/java':function(){
/**
 * Browser back support.
 * Note: java.js has minimal dependencies, and no dijit or parser dependencies to keep code small.
 */
define("jbundle/java", [
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

	initialized: false,
	// Initialize environment
	init: function()
	{	// Push initial history
		if (this.initialized == true)
			return;
		/**
		 * For java to call these, these must be at the root.
		 */
		window.pushBrowserHistory = function(command, title)
		{
			require(['jbundle/java', 'dojo/domReady!'], function(java) {
			 java.pushBrowserHistory(command, title);
			});
		};
		window.popBrowserHistory = function(count, commandHandledByClient, title)
		{
			require(['jbundle/java', 'dojo/domReady!'], function(java) {
			 java.popBrowserHistory(count, commandHandledByClient, title);
			});
		};

		this.initialized = true;

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
		return true;	// This is only for tourgeek windows
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
		"jbundle/back", ["dojo/hash", "dojo/topic"],
			function(hash, topic) {
		    return {

	// module:
	//		jbundle/back
	// summary:
	//		The code skeleton was copied from the deprecated module dojo/back. Thanks!

	forwardStack: [],
	historyStack: [],
	initialized: false,
	CRAWLABLE: false,	// Change this to true and URLs will be #! crawlable

	init: function() {
		if (this.initialized == true)
			return;

		topic.subscribe("/dojo/hashchange", this.hashChange);
		
		this.initialized = true;
	},

	setHash: function(h){
		// Change the browser URL hash
		if (dojoConfig.isDebug == true)
			console.log("setHash:" + h);
		if(!h){ h = ""; }
		if (this.CRAWLABLE)
			if (h.charAt(0) !== "!")
				h = "!" + h;	// Makes it crawlable
        window.location.hash = encodeURIComponent(h);
    },

	setInitialState: function(/*Object*/args){
		//summary:
		//		Sets the state object and back callback for the very first page
		//		that is loaded.
		//description:
		//		It is recommended that you call this method as part of an event
		//		listener that is registered via dojo.addOnLoad().
		//args: Object
		//		See the addToHistory() function for the list of valid args properties.
		if (dojoConfig.isDebug == true)
			console.log("setInitialState:" + args);

		initialHref = (typeof(window) !== "undefined") ? window.location.href : "";
		initialHash = (typeof(window) !== "undefined") ? hash() : "";

		initialState = this.createState(initialHref, args, initialHash);
		
		this.forwardStack = [];
		this.historyStack = [];
		
		this.historyStack.push(initialState);
	},

	createState: function(url, args, hash){
		//summary: private method. Do not call this directly.
		if (!this.initialized)
			this.init();
		return {"url": url, "args": args, "urlHash": hash};	//Object
	},

	addToHistory: function(/*dojo.__backArgs*/ args){
		//	summary:
		//		adds a state object (args) to the history list.
		//	args: dojo.__backArgs
		//		The state object that will be added to the history list.
		//	description:
		//		To support getting back button notifications, the object
		//		argument should implement a function called "back".

		//If addToHistory is called, then that means we prune the
		//forward stack -- the user went back, then wanted to
		//start a new forward path.
		if (dojoConfig.isDebug == true)
			console.log("addToHistory:" + args);

		this.forwardStack = [];

		var hashValue = null;
		var url = null;
		if(args["changeUrl"]){
			hashValue = ""+ ((args["changeUrl"]!==true) ? args["changeUrl"] : (new Date()).getTime());

			//If the current hash matches the new one, just replace the history object with
			//this new one. It doesn't make sense to track different state objects for the same
			//logical URL. This matches the browser behavior of only putting in one history
			//item no matter how many times you click on the same #hash link, at least in Firefox
			//and Safari, and there is no reliable way in those browsers to know if a #hash link
			//has been clicked on multiple times. So making this the standard behavior in all browsers
			//so that dojo.back's behavior is the same in all browsers.
			if(this.historyStack.length == 1 && this.historyStack[0].urlHash == hashValue){
				this.historyStack[0] = this.createState(url, args, hashValue);
				return;
			} else if(this.historyStack.length > 0 && this.historyStack[this.historyStack.length - 1].urlHash == hashValue) {
				this.historyStack[this.historyStack.length - 1] = this.createState(url, args, hashValue);
				return;
			}
		}

		this.historyStack.push(this.createState(url, args, hashValue));
		setTimeout(function() {
			require (["jbundle/back"],
				function(back) {
					back.setHash(hashValue);
				});
		}, 1);
	},

	handleBackButton: function(){
		//summary: private method. Do not call this directly.
		if (dojoConfig.isDebug == true)
			console.log("handleBackButton");
		//The "current" page is always at the top of the history stack.
		if (this.historyStack.length > 0)
		{
			var current = this.historyStack.pop();
			if(!current){ return; }
		}
		var last = this.historyStack[this.historyStack.length-1];
		if (last)
			if (last.args)
				if (last.args.back) {
			last.args.back();
		}
		this.forwardStack.push(current);
	},

	handleForwardButton: function(){
		//summary: private method. Do not call this directly.
		if (dojoConfig.isDebug == true)
			console.log("handleForwardButton");
		var last = this.forwardStack.pop();
		if(!last){ return; }
		last.args.forward();
		this.historyStack.push(last);
	},

	hashChange: function(hashValue)
	{
		// Respond to a browser hash change event.
		require (["jbundle/back"],
				function(back) {
			if (this.CRAWLABLE)
				if (hashValue.charAt(0) === "!")
					hashValue = hashValue.substring(1);	// Make it crawlable
			back.checkLocation(hashValue);
		});
	},

	checkLocation: function(hashValue) {
		// Respond to a browser hash change event.
		if (dojoConfig.isDebug == true)
			console.log("checkLocation:" + hashValue);

		var hsl = this.historyStack.length;

		if(this.historyStack.length > 0 && encodeURIComponent(this.historyStack[this.historyStack.length - 1].urlHash) == hashValue) {
			if (dojoConfig.isDebug == true)
				console.log("checkLocation:ignore");
			return;	// Ignore - already the starting hash value
		}

		if(this.historyStack.length > 1 && encodeURIComponent(this.historyStack[this.historyStack.length - 2].urlHash) == hashValue) {
			if (dojoConfig.isDebug == true)
				console.log("checkLocation:back");
			this.handleBackButton();
			return;
		}
		
		// first check to see if we could have gone forward. We always halt on
		// a no-hash item.
		if(this.forwardStack.length > 0){
			if(encodeURIComponent(this.forwardStack[this.forwardStack.length-1].urlHash) === hashValue){
				this.handleForwardButton();
				return;
			}
		}

		// ok, that didn't work, try someplace back in the history stack
		if((hsl >= 2)&&(this.historyStack[hsl-2])){
			if(encodeURIComponent(this.historyStack[hsl-2].urlHash) === hashValue){
				this.handleBackButton();
			}
		}
		
		// If I'm getting a new hash value, I better push it on my history stack
		// ??
	}
}});

},
'jbundle/thinutil':function(){
/**
 * Base utilities.
 */
define("jbundle/thinutil", [
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
	], function(java, back){
    return {
	init: function()
	{
		back.init();
		java.init();
	},
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    runAppletWithCommand: function(command, hash, version) {
    		java.runAppletWithCommand(command, hash, version);
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     * NOTE: This method only works with the gui code.
     */
    getAppletWithCommand: function(command, hash, version) {
    	return java.getAppletWithCommand(command, hash, version);
    },
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    writeAppletTag: function(attributes, parameters) {
    	return java.writeAppletTag(attributes, parameters);
    }
  };
});
