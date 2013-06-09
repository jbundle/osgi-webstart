/**
 * Public Utilities.
 */
// + dojo.addOnLoad(jbundle.util, "init");

define([
	"jbundle/main",
	"jbundle/gui",
	"jbundle/classes",
	"jbundle/remote",
	"jbundle/xml",
	"jbundle/thinutil",
	"jbundle/java",
	"dijit/registry",
	"dojo/aspect",
	"dojo/_base/declare",
	"jbundle/back",
	"dojo/_base/unload",
	"dojo/domReady!"
], function(main, gui, classes, remote, xml, thinutil, java, registry, aspect, declare, back, baseUnload){
    return {
    
	/*
	ApplicationState is an object that represents the application state.
	It will be given to dojo.undo.browser to represent the current application state.
	*/
    ApplicationState:
		declare(null, {
			// The constructor
			constructor: function(screenCommand, bookmarkValue, stateData, util, java) {
				this.command = screenCommand;
				this.data = stateData;
				if (bookmarkValue)	// The browser URL to change
					this.changeUrl = bookmarkValue;
				this.util = util;
				if (java)
					this.java = java;
			},
			back: function(data) {
				if (typeof this.java !== 'undefined')
					if (this.java.isJavaWindow())
						this.java.prepareWindowForApplet(false);		// Change from applet display
				if (this.data)
				{
					var response = {};
					response.data = this.data;
					this.util.doRemoteScreenActionCallback(response);
				}
				else
					this.util.doCommand(this.command, true, false);
			},

			forward: function() {
				if (typeof this.java !== 'undefined')
					if (this.java.isJavaWindow())
						this.java.prepareWindowForApplet(false);		// Change from applet display
				if (this.data)
				{
					var response = {};
					response.data = this.data;
					this.util.doRemoteScreenActionCallback(response);
				}
				else
					this.util.doCommand(this.command, true, false);
			}
		}),

	/**
	 * Initialize environment.
	 */
	init: function(user, password)
	{
		baseUnload.addOnUnload(function() {
			require(["jbundle/util"], function(util) {
				util.free();
			})
		});

	  	if (dojoConfig.isDebug)
		  	console.log("init env");
	  	main.gEnvState = true;

		main.gTaskSession = new classes.Session();
// For now, you'll have to start the queues manually
//		this.addSendQueue();
//		this.addReceiveQueue();
		if (!user)
			user = this.getCookie("userid");
		if (!password)
			password = "";
		htmlSession = this.getCookie("JSESSIONID");
		if (!user)
			if (htmlSession)
				user = "";	// Special case - The html session is authenticated - need to re-sign on as anonymous
	  	
	  	var pathname = location.pathname;
	  	var host = location.hostname;
	  	var search = location.search;
	  	if ((!user) || (user == ""))
	  	{	// User passed in in URL
	  		if (thinutil.getProperty(search, "user"))
	  			user = thinutil.getProperty(search, "user");
	  	}
		if (search)
			if (search != "")
				if (thinutil.getProperty(search, "menu") != null)
					this.lastCommand = search;	// Make sure it does the correct command.
	  	
	  	this.user = user;

		var props = {
  			user: user,
			password: password
		};
		if (thinutil.getProperty(search, "systemname"))
			props.systemname = thinutil.getProperty(search, "systemname");
		else if (thinutil.getProperty(thinutil.getCommandFromHash(window.location.hash), "systemname"))
			props.systemname = thinutil.getProperty(thinutil.getCommandFromHash(window.location.hash), "systemname");
		
		this.handleCreateRemoteTaskLink = aspect.after(remote, "handleCreateRemoteTask", function(response) {
			require(["jbundle/util"], function(util) {
				util.handleCreateRemoteTask(response);
			})}, true);
		remote.createRemoteTask(props);
	  	
	  	if (pathname)
	  		if (main.SERVER_PATH == "")
	  	{	// Nail down the host name, so call won't mistakenly call relative to .js directories
	  		if (pathname.lastIndexOf("/") != -1)
	  			pathname = pathname.substring(0, pathname.lastIndexOf("/"));
	  		pathname = pathname + "/";
	  		main.SERVER_PATH = pathname;
	  	}
	  	var command = window.location.search;
		var bookmarkId = thinutil.getCommandFromHash(window.location.hash);
		if ((command) && (bookmarkId))
			command = command + '&' + bookmarkId;
		else if (bookmarkId)
			command = bookmarkId;
		if (!command)
			command = this.DEFAULT_MENU;
		if (user == '')
			if (command != this.DEFAULT_MENU)
				if (thinutil.getProperty(command, "menu") != null)
					this.lastCommand = command;	// Special case
		if (!user)
			if (host)
			{
//?				var iDot = host.lastIndexOf('.com');
//?				if (iDot == -1)
//?					iDot = host.length;
//?				iDot = host.lastIndexOf('.', iDot - 1);
//?				if (iDot != -1)
//?					host = host.substring(iDot + 1);
//?				command = command + host;
			}

		if (bookmarkId && (bookmarkId.indexOf("?") == 0))
		{	//If we have a bookmark, load that as the initial state.
			command = bookmarkId;
			if (command != this.DEFAULT_MENU)
				this.lastCommand = command;
		} else {
			// Nothing special to do on initial page load
		}
		// Push initial history
		var appState = new this.ApplicationState(command, bookmarkId, null, this, java);
		back.setInitialState(appState);
	},
	DEFAULT_MENU: "?menu=",
	user: null,
	// handleLogin event link. Note: Is there a potential concurrency problem here?
	handleCreateRemoteTaskLink: null,
	// Special handler to sign on user after create initial task.
	handleCreateRemoteTask: function(request)
	{
		if (this.handleCreateRemoteTaskLink)
			this.handleCreateRemoteTaskLink.remove();
		this.handleCreateRemoteTaskLink = null;
		if (this.user != null)
		{
			this.saveUser = null;	// Don't change cookie
			this.doLoginCommandLink = aspect.after(remote, "handleLogin", function(response) {
				require(["jbundle/util"], function(util) {
					util.doLoginCommand(response);
				})}, true);
			this.handleLoginLink = aspect.after(remote, "handleLogin", function(response) {
				require(["jbundle/util"], function(util) {
					util.handleLogin(response);
				})}, true);
			var props = {
		  			user: this.user
				};
			remote.login(main.getTaskSession(), props);
		}
		if (!this.user)
		{
			var action = "Login";
			gui.changeUser(null);
			require (["dijit/registry", "jbundle/gui"], function(registry, gui) {
				gui.changeButton(registry.byId(gui.LOGOUT_DESC), gui.LOGIN_DESC, action);	// Could be either
				gui.changeButton(registry.byId(gui.LOGIN_DESC), gui.LOGIN_DESC, action);
			});
		}
	},
	/**
	 * Free the environment.
	 */
	free: function()
	{
	  	main.gEnvState = false;	// Ignore the errors (from canceling the receive loop)
		if (main.gTaskSession)
			remote.freeRemoteSession(main.gTaskSession);
	},
	/**
	 * Make a remote session.
	 */
	makeRemoteSession: function(sessionClassName)
	{
		var session = new classes.Session(main.getTaskSession());
		session.sessionClassName = sessionClassName;
		if (session.parentSession.sessionID)	// Only add the physical session if the parent session is set up, otherwise the handler will set it up later
			remote.makeRemoteSession(session);
		return session;
	},
	/**
	 * Login.
	 */
	login: function(props)
	{
		remote.login(main.getTaskSession(), props);
	},
	/**
	 * Logout.
	 */
	logout: function()
	{
		this.setCookie("userid", null);	// Clear cookie

		this.lastCommand = "?menu=";
		this.doLoginCommandLink = aspect.after(remote, "handleLogin", function(response) {
			require(["jbundle/util"], function(util) {
				util.doLoginCommand(response);
			})}, true);

		this.handleLoginLink = aspect.after(remote, "handleLogin", function(response) {
			require(["jbundle/util"], function(util) {
				util.handleLogin(response);
			})}, true);

		remote.login(main.getTaskSession(), null);
	},
	/**
	 * Add a new send message queue.
	 */
	addSendQueue: function(filter)
	{
		if (!filter)
			filter = new Object();
		if (filter.queueName == null)
			filter.queueName = main.TRX_SEND_QUEUE;
		if (filter.queueType == null)
			filter.queueType = main.DEFAULT_QUEUE_TYPE;
		if (main.getTaskSession().getSendQueue(filter.queueName, filter.queueType))
			return;	// The queue already exists.
		var sendQueue = new classes.SendQueue(main.getTaskSession(), filter.queueName, filter.queueType);
		if (main.getTaskSession().sessionID)	// Only add if the remote task session exists (otherwise this will be called automatically)
			remote.createRemoteSendQueue(sendQueue);
		return sendQueue;
	},
	/**
	 * Add a new receive message queue.
	 */
	addReceiveQueue: function(filter)
	{
		if (!filter)
			filter = new Object();
		if (filter.queueName == null)
			filter.queueName = main.TRX_RECEIVE_QUEUE;
		if (filter.queueType == null)
			filter.queueType = main.DEFAULT_QUEUE_TYPE;
		var receiveQueue = main.getTaskSession().getReceiveQueue(filter.queueName, filter.queueType);
		if (receiveQueue)
			return receiveQueue;	// The queue already exists.
	  	receiveQueue = new classes.ReceiveQueue(main.getTaskSession(), filter.queueName, filter.queueType);
		if (main.getTaskSession().sessionID)	// Only add if the remote task session exists (otherwise this will be called automatically)
			remote.createRemoteReceiveQueue(receiveQueue);
		return receiveQueue;
	},
	/**
	 * Send a message.
	 */
	sendMessage: function(message)
	{
		if (message.queueName == null)
			message.queueName = jbundle.TRX_SEND_QUEUE;
		if (message.queueType == null)
			message.queueType = main.DEFAULT_QUEUE_TYPE;
		var sendQueue = main.getTaskSession().getSendQueue(message.queueName, message.queueType);
		if (!sendQueue)
			sendQueue = this.addSendQueue(message);
		remote.sendMessage(sendQueue, message.data);
	},
	/**
	 * Add a message listener to this receive queue.
	 */
	addMessageListener: function(filter)
	{
		if (filter.queueName == null)
			filter.queueName = main.TRX_RECEIVE_QUEUE;
		if (filter.queueType == null)
			filter.queueType = main.DEFAULT_QUEUE_TYPE;
		var receiveQueue = main.getTaskSession().getReceiveQueue(filter.queueName, filter.queueType);
		if (!receiveQueue)
			receiveQueue = this.addReceiveQueue(filter);
		var messageFilter = new classes.MessageFilter(receiveQueue, filter.onMessage, filter.session);
		if (receiveQueue.sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			remote.addRemoteMessageFilter(messageFilter);
	},
	/**
	 * Handle an onClick in an <a> link.
	 */
	handleLink: function(link)
	{
		if (link)
		{
			var command = link.href;
			if (command)
				return this.doCommand(command);	// Link handled, don't follow link
		}
		return true;	// Link not handled by me, so follow link
	},
	/**
	 * Do this screen link command.
	 */
	doLink: function(command)
	{
		this.doCommand(command);
	},
	/**
	 * Do this screen button command.
	 */
	doButton: function(command)
	{
		if (command.indexOf("?") == -1)
			command = "command=" + command;
		this.doCommand(command);
		return false;	// This tells form not to submit.
	},
	// Last command
	lastCommand: null,
	// Do this screen command
	doCommand: function(command, decode, addHistory)
	{
		if (arguments.length < 3)
			addHistory = true;
		if (command == null)
			return;
		if (decode == null)
			decode = true;
		if (decode)
			command = decodeURI(command);
		if ((command.indexOf("Login") != -1) || (thinutil.getProperty(command, "user") == ''))
		{
			var user = thinutil.getProperty(command, "user");
			if (user == "")
				user = null;
			if (user == null)
			{
				if (main.getTaskSession())
				if (main.getTaskSession().security)
					if (main.getTaskSession().security.userProperties)
						if (main.getTaskSession().security.userProperties.user)
							user = main.getTaskSession().security.userProperties.user;
				if ((user == "1") || (user == ""))
					user = null;
			}
			if (user == null)
				gui.displayLogonDialog();
			else
				this.logout();
		}
		else if (command.indexOf("preferences=") != -1)
		{
			var navmenus = thinutil.getProperty(command, "navmenus");
			if (navmenus)
				gui.changeNavMenus(navmenus);
		}
		else if (thinutil.getProperty(command, "help") != null)
		{
			if (this.lastCommand)
				if (thinutil.getProperty(command, "class") != null)
					command = this.lastCommand + "&help=";
			this.doScreen(command, addHistory);
		}
		else if (((thinutil.getProperty(command, "screen") != null)
			|| (thinutil.getProperty(command, "menu") != null)
			|| (thinutil.getProperty(command, "xml") != null)
			|| (thinutil.getProperty(command, "record") != null))
			&& (thinutil.getProperty(command, "applet") == null))
		{
			if ((thinutil.getProperty(command, "user") != null)
				&& (thinutil.getProperty(command, "user").length > 0)
				&& ((this.user == null) || (this.user.length == 0) || (this.user != thinutil.getProperty(command, "user"))))
			{	// Special case - sign on before doing command.
				var user = thinutil.getProperty(command, "user");
				var password = thinutil.getProperty(command, "auth");

//				gui.handleLoginLink = aspect.after(remote, "handleLogin", function(response) {
//					require(["jbundle/gui"], function(gui) {
//						gui.handleLogin(response);
//					})}, true);
				this.lastCommand = command;
				this.doLoginCommandLink = aspect.after(remote, "handleLogin", function(response) {
					require(["jbundle/util"], function(util) {
						util.doLoginCommand(response);
					})}, true);
				var props = {
			  			user: user,
						password: password
					};
				remote.login(main.getTaskSession(), props);
			}
			else
			{
				this.lastCommand = command;	// TODO (don) This logic is very weak
				this.doScreen(command, addHistory);
			}
		}
		else if (thinutil.getProperty(command, "command"))
		{
			this.doLocalCommand(command, addHistory);
		}
		else if (thinutil.getProperty(command, "applet") != null)
		{
			javaApplet = null;
			if (main.getTaskSession().security != null)	// Signed on
				javaApplet = main.getTaskSession().security.userProperties.javaApplet;
			if ((!javaApplet) || ((javaApplet.indexOf('J') == 0) || (javaApplet.indexOf('Y') == 0)))
			{	// Display an applet
				// Note: For now I do not render an applet page, I jump to a new applet page (Since I can't figure out how to run js in xsl)
				if (gui.displayApplet(command) == true)
					return false;	// Success
				// drop thru if not handled
			}
			console.log("do link: " + command);
			window.location = command;
		}
		else
		{	// This is just a link to be opened in the browser
			console.log("do link: " + command);
			window.location = command;
		}
		return false;	// In case this was called from onClick in a link (do not follow link since I handled the link).
	},
	// handleLogin event link. Note: Is there a potential concurrency problem here?
	doLoginCommandLink: null,
	// After logging into a new account, process the command.
	doLoginCommand: function()
	{
		if (this.doLoginCommandLink)
			this.doLoginCommandLink.remove();
		this.doLoginCommandLink = null;


		var command = this.lastCommand;
		if (thinutil.getProperty(command, "user") != null)
		{	// strip out user param
			var iStart = command.indexOf("user=");
			var iEnd = command.indexOf("&", iStart);
			if (iEnd == -1)
				command = command.substring(0, iStart - 1);
			else
				command = command.substring(0, iStart - 1) + command.substring(iEnd);
		}
		this.lastCommand = command;	// Make sure this is the 'last' command
		if ((command) && (command != ""))
			this.doCommand(command, false, false);		
	},
	/**
	 * User pressed submit or cancel.
	 */
	submitLogonDialog: function(submit)
	{
		dlg0 = registry.byId("logonDialog");
		if (submit == true)
		{
			var form = document.getElementById("logonForm");
			var user = form.elements.user.value;
			var command = form.elements.command.value;

			var password = form.elements.password.value;
			this.saveUser = form.elements.saveUser.checked;

			if (password)
				password = b64_sha1(password);

			this.lastCommand = "?menu=";
			this.doLoginCommandLink = aspect.after(remote, "handleLogin", function(response) {
				require(["jbundle/util"], function(util) {
					util.doLoginCommand(response);
				})}, true);

			if (command)
				if (command != "")
			{
				this.lastCommand = command;	// Make sure it does the correct command.
				this.handleLoginLink = aspect.after(remote, "handleLogin", function(response) {
					require(["jbundle/util"], function(util) {
						util.handleLogin(response);
					})}, true);
			}
			var props = {
		  			user: user,
					password: password
				};
			remote.login(main.getTaskSession(), props);
		}
		dlg0.hide();
		if (submit)
			if (submit != true)
			if (submit != false)
		{
			this.doCommand(submit);
		}
		return false;	// If called from post, don't submit form
	},
	// Save the user name.
	saveUser: null,
	// handleLogin event link. Note: Is there a potential concurrency problem here?
	handleLoginLink: null,
	/**
	 *
	 */
	handleLogin: function(response)
	{
		if (this.handleLoginLink)
			this.handleLoginLink.remove();
		this.handleLoginLink = null;
//		if (remote.checkForDataError(data, "Could not log in"))
	//		return;
		var user = "";
		var userid = null;
		if (main.getTaskSession().security)
			if (main.getTaskSession().security.userProperties)
		{
			user = main.getTaskSession().security.userProperties.user;
			userid = main.getTaskSession().security.userProperties.userid;
		}
		if ((this.saveUser == true)
			&& (userid)
				&& (userid != "1"))	// Anon
			this.setCookie("userid", userid, +365);
		else if (this.saveUser == false)
			this.setCookie("userid", null);
		this.saveUser = null;
		gui.changeUser(user);
		var desc = this.LOGOUT_DESC;
		var command = "Logout";
		if ((!user) || (user == "") || (userid == "1"))
		{
			desc = this.LOGIN_DESC;
			command = "Login";
		}
		gui.changeButton(registry.byId(this.LOGIN_DESC), desc, command);	// Could be either
		gui.changeButton(registry.byId(this.LOGOUT_DESC), desc, command);
	},
	LOGOUT_DESC: "Sign out",	// Change these for I18N
	LOGIN_DESC: "Sign in",
	/*
	 * Local commands are formatted commmand=xyz
	 */
	doLocalCommand: function(command, addHistory)
	{
		var commandTarget = thinutil.getProperty(command, "command");
		console.log("do local command: " + command);
		if (commandTarget == "Back")
		{
			parent.frames[0].history.back();
		}
		else if (commandTarget == "Submit")
		{
			this.submitData(commandTarget);
		}
		else if (commandTarget == "Reset")
		{
			gui.clearFormData();
		}
		else if (commandTarget == "Delete")
		{
			this.deleteData(command);
		}
		else if ((commandTarget == "FormLink")
			|| (commandTarget == "Form")
			|| (commandTarget == "Link"))
		{
			this.doScreen(command, addHistory);
		}
		else
		{
			this.submitData(commandTarget);
		}
	},
	/**
	 * Submit the form data to the screen.
	 */
	submitData: function(command) {
		var messageFilter = new classes.MessageFilter(this.getAjaxSession(), this.doRemoteSubmitCallback);
		messageFilter.name = command;
		messageFilter.properties = gui.getFormData();
		if (this.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
		{
			gui.waitCursor();
			remote.doRemoteAction(messageFilter);
		}
	},
	/**
	 * Handle the XML coming back from the menu action.
	 */
	doRemoteSubmitCallback: function(response)
	{
		require(["jbundle/util"], function(util) {
			var bSuccess = util.handleReturnData(response);
			if (bSuccess == true)
				gui.clearFormData();
			gui.restoreCursor();
    	});
	},
	/**
	 * Submit the form data to the screen.
	 */
	deleteData: function(command) {
		var messageFilter = new classes.MessageFilter(this.getAjaxSession(), this.doRemoteDeleteCallback);
		messageFilter.name = command;
		if (gui.isForm())
			messageFilter.properties = gui.getFormData(true);	// Hidden fields
		if (this.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			remote.doRemoteAction(messageFilter);
	},
	/**
	 * Handle the XML coming back from the menu action.
	 */
	doRemoteDeleteCallback: function(response)
	{
		require(["jbundle/util"], function(util) {
			var bSuccess = util.handleReturnData(response);
			if (bSuccess == true)
			{
				if (gui.isForm())
				{
					gui.clearFormData();
				}
				else
				{
					if (response)
						if (response.options)
							if (response.options.ioArgs)
								if (response.options.ioArgs.content)
									if (response.options.ioArgs.content.name)
					gui.clearGridData(thinutil.getProperty(response.options.ioArgs.content.name, "objectID"));
				}
			}
    	});
	},
	/**
	 * Get my ajax session.
	 */
	getAjaxSession: function()
	{
		if (!this.jsSession)
			this.jsSession = this.makeRemoteSession(".main.remote.AjaxScreenSession");
		return this.jsSession;
	},
	jsSession: null,
	/**
	 * Do this screen command.
	 */
	doScreen: function(command, addHistory)
	{
		console.log("do screen: " + command);
		var messageFilter = new classes.MessageFilter(this.getAjaxSession(), this.doRemoteScreenActionCallback);
		messageFilter.bindArgs = {
			addHistory: addHistory
		};
		//?messageFilter.bindArgs.handleAs = "xml";

		messageFilter.name = "createScreen";
		messageFilter.properties = thinutil.commandToProperties(command);
		if (this.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			remote.doRemoteAction(messageFilter);
	},
	// Handle the XML coming back from the menu action
	doRemoteScreenActionCallback: function(response)
	{
		require(["jbundle/util"], function(util) {
			util.handleReturnData(response);
    	});
	},
	
	
	
	addMessageFilter: function(response)
	{
		var options = response.options;
		
//		var receiveSession = this.addReceiveQueue();
	//	var session = main.getTaskSession().getSessionByFullSessionID(response.options.ioArgs.target);
		//var messageFilter = new classes.MessageFilter(receiveSession, null, session);
		//this.addMessageListener(messageFilter);
	},
	
	
	
	// Handle the XML coming back from the menu action
	// Return true if success (non-error return)
	handleReturnData: function(response)
	{
		var data = response.data;
		var options = response.options;
		var domToBeTransformed = xml.parse(data);
		var info = domToBeTransformed.getElementsByTagName("status-text");
		if (info)
			if (info.length > 0)
				if (info[0].parentNode == domToBeTransformed)
		{
			if (this.checkCommand(info[0]))
				return true;
			var infoLevel = this.handleScreenInfoMessage(info[0]);
			return (infoLevel != "error");	// Only return false if error level
		}

		var domToAppendTo = document.getElementById("content-area");
		var contentParent = domToAppendTo.parentNode;
		// First, delete all the old nodes
		thinutil.removeChildren(domToAppendTo, true);	// Note: I remove the node also since the replacement's root is <div id='content-area'>
		// Then, add the new nodes (via xslt)
		var desc = gui.changeTitleFromData(domToBeTransformed);
		if (options)
			if (options.addHistory)
		{
			var command = options.ioArgs.name;
			var bookmark = thinutil.propertiesToCommand(options.ioArgs.properties);
			var appState = new this.ApplicationState(command, bookmark, data, this, null);
			back.addToHistory(appState);
		}
		// Extract stylesheet name from XML
		var xsltURI = null;
		for (var i = 0; i < domToBeTransformed.childNodes.length; i++)
		{
			if (domToBeTransformed.childNodes[i].nodeType == 7) // Node.PROCESSING_INSTRUCTION_NODE)
				if (domToBeTransformed.childNodes[i].nodeName == "xml-stylesheet")
				{
					data = domToBeTransformed.childNodes[i].data;
					var startURI = data.indexOf("href=\"");
					if (startURI != -1)
					{
						startURI  = startURI + 6;
						var endURI = data.indexOf("\"", startURI);
						xsltURI = data.substring(startURI, endURI);
					}
					break;
				}
		}
		if (xsltURI == null)
			xsltURI = "org/jbundle/res/docs/styles/xsl/ajax/base/menus-ajax.xsl";
		xsltURI = main.getServerPath(xsltURI);
		xml.doXSLT(domToBeTransformed, xsltURI, contentParent, gui.fixNewDOM);
		
		if (typeof options != 'undefined')
			if (typeof options.ioArgs != 'undefined')
			if (options.ioArgs.remoteCommand = 'doRemoteAction')
				if (options.ioArgs.name = 'createScreen')
					this.addMessageFilter(response);

		return true;	// Success (so far)
	},
	// See if this status message contains a command
	checkCommand: function(infoDOM)
	{
		var command; 
		if (infoDOM.getElementsByTagName("command"))
			if (infoDOM.getElementsByTagName("command")[0])
				command = infoDOM.getElementsByTagName("command")[0].firstChild.nodeValue;
		if (command)
		{
			this.doCommand(command);
			return true;
		}
		return false;	// No command in status text.
	},
	// Handle this return error or info message.
	// Return the error level.
	handleScreenInfoMessage: function(infoDOM)
	{
		var ACCESS_DENIED = 101, LOGIN_REQUIRED = 102, AUTHENTICATION_REQUIRED = 103, CREATE_USER_REQUIRED = 104;
		var errorCode = infoDOM.getElementsByTagName("errorCode");
		if ((errorCode) && (errorCode[0]) && (errorCode[0].firstChild))
			errorCode = errorCode[0].firstChild.nodeValue;
		else
			errorCode = null;
		var error = 0;
		if (errorCode)
		{
			try {
				error = parseInt(errorCode);
			} catch (ex) {
				error = 0;
			} 
		}
		var infoClass = infoDOM.getElementsByTagName("error")[0].firstChild.nodeValue;
		var infoText = infoDOM.getElementsByTagName("text")[0].firstChild.nodeValue;
		if (error == 0)
			if (infoText)
			{
				try {
					error = parseInt(infoText);
					if (error)
						infoText = null;
				} catch (ex) {
					error = 0;
				} 
			}
		if (!infoText)
		{
			if (error == AUTHENTICATION_REQUIRED)
				infoText = "Authentication required";
			else if (error == LOGIN_REQUIRED)
				infoText = "Sign in required";
			else if (error == ACCESS_DENIED)
				infoText = "Access denied";
		}
		if ((error == AUTHENTICATION_REQUIRED) || (error == LOGIN_REQUIRED))
			gui.displayLogonDialog(null, null, infoText, this.lastCommand);	// Repeat the last command
		else if (error == ACCESS_DENIED)
			gui.displayErrorMessage(infoText);
		else if (error == CREATE_USER_REQUIRED)
			;	// ?
		else
			gui.displayScreenInfoMessage(infoText, infoClass);
		return infoClass;
	},
	// Convert this array to an xml string
	propertiesToXML: function(properties)
	{
		xml = "";
		if (!properties)
			return xml;
		for (var key in properties)
		{
			xml = xml + '<' + key + '>' + properties[key] + '</' + key + '>\n';
		}
		return xml;
	},
	// Set this cookie (if value=null, delete the cookie)
	setCookie: function(name, value, days)
	{
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else
			var expires = "";
		if (!value)
			value = "";
		document.cookie = name+"="+escape(value)+expires+"; path=/";
	},
	// Get this cookie.
	getCookie: function(name)
	{
		var value = thinutil.getProperty(document.cookie, name);
		if (value != null)
			value = unescape(value);
		return value;
	},
	// Non-history hash change
	hashChange: function(command)
	{
		this.doCommand(this.command, true, false);
	}
  };
});

