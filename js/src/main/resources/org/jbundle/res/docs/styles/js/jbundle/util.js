/**
 * Top level methods and vars.
 */
if(!dojo._hasResource["jbundle.util"]){
dojo._hasResource["jbundle.util"] = true;
dojo.provide("jbundle.util");

dojo.require("dojox.data.dom");
dojo.require("dojo.back");

/**
 * Public Utilities.
 */
jbundle.util = {
	// Initialize environment
	init: function(user, password)
	{
		dojo.addOnUnload(jbundle.util, "free");
	
	  	if (djConfig.isDebug)
		  	if (console)
			  	console.log("init env");
	  	jbundle.gEnvState = true;

		jbundle.gTaskSession = new jbundle.classes.Session();
// For now, you'll have to start the queues manually
//		jbundle.util.addSendQueue();
//		jbundle.util.addReceiveQueue();
		if (!user)
			user = jbundle.util.getCookie("userid");
		if (!password)
			password = "";
		htmlSession = jbundle.util.getCookie("JSESSIONID");
		if (!user)
			if (htmlSession)
				user = "";	// Special case - The html session is authenticated - need to re-sign on as anonymous
	  	
	  	var pathname = location.pathname;
	  	var host = location.hostname;
	  	var search = location.search;
	  	if ((!user) || (user == ""))
	  	{	// User passed in in URL
	  		if (jbundle.java.getProperty(search, "user"))
	  			user = jbundle.java.getProperty(search, "user");
	  	}
		if (search)
			if (search != "")
				if (jbundle.java.getProperty(search, "menu") != null)
					jbundle.util.lastCommand = search;	// Make sure it does the correct command.
	  	
	  	jbundle.util.user = user;
		jbundle.gui.handleCreateRemoteTaskLink = dojo.connect(jbundle.remote, "handleCreateRemoteTask", jbundle.util, "handleCreateRemoteTask");

	  	jbundle.remote.createRemoteTask(user, password);
	  	
	  	if (pathname)
	  		if (jbundle.SERVER_PATH == "")
	  	{	// Nail down the host name, so call won't mistakenly call relative to .js directories
	  		if (pathname.lastIndexOf("/") != -1)
	  			pathname = pathname.substring(0, pathname.lastIndexOf("/"));
	  		pathname = pathname + "/";
	  		jbundle.SERVER_PATH = pathname;
	  	}
	  	var command = window.location.search;
		var bookmarkId = jbundle.java.getCommandFromHash(window.location.hash);
		if ((command) && (bookmarkId))
			command = command + '&' + bookmarkId;
		else if (bookmarkId)
			command = bookmarkId;
		if (!command)
			command = jbundle.util.DEFAULT_MENU;
		if (user == '')
			if (command != jbundle.util.DEFAULT_MENU)
				if (jbundle.java.getProperty(command, "menu") != null)
					jbundle.util.lastCommand = command;	// Special case
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
			if (command != jbundle.util.DEFAULT_MENU)
				jbundle.util.lastCommand = command;
		} else {
			// Nothing special to do on initial page load
		}
		dojo.addOnLoad(function(){
			var appState = new jbundle.util.ApplicationState(command, bookmarkId, null);
			dojo.back.setInitialState(appState);
		});
	},
	DEFAULT_MENU: "?menu=",
	user: null,
	// handleLogin event link. Note: Is there a potential concurrency problem here?
	handleCreateRemoteTaskLink: null,
	// Special handler to sign on user after create initial task.
	handleCreateRemoteTask: function(data, ioArgs)
	{
		dojo.disconnect(jbundle.util.handleCreateRemoteTaskLink);
		if (jbundle.util.user != null)
		{
			jbundle.util.saveUser = null;	// Don't change cookie
			jbundle.gui.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.gui, "handleLogin");
			jbundle.util.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.util, "doLoginCommand");
			jbundle.remote.login(jbundle.getTaskSession(), jbundle.util.user);
		}
		if (!jbundle.util.user)
		{
			var action = "Login";
			jbundle.gui.changeUser(null);
			jbundle.gui.changeButton(dijit.byId(jbundle.gui.LOGOUT_DESC), jbundle.gui.LOGIN_DESC, action);	// Could be either
			jbundle.gui.changeButton(dijit.byId(jbundle.gui.LOGIN_DESC), jbundle.gui.LOGIN_DESC, action);
		}
	},
	// Free the environment
	free: function()
	{
	  	jbundle.gEnvState = false;	// Ignore the errors (from canceling the receive loop)
		if (jbundle.gTaskSession)
			jbundle.remote.freeRemoteSession(jbundle.gTaskSession);
	},
	// Make a remote session
	makeRemoteSession: function(sessionClassName)
	{
		var session = new jbundle.classes.Session(jbundle.getTaskSession());
		session.sessionClassName = sessionClassName;
		if (session.parentSession.sessionID)	// Only add the physical session if the parent session is set up, otherwise the handler will set it up later
			jbundle.remote.makeRemoteSession(session);
		return session;
	},
	// Login
	login: function(user, password)
	{
		jbundle.remote.login(jbundle.getTaskSession(), user, password);
	},
	// Logout
	logout: function()
	{
		jbundle.util.setCookie("userid", null);	// Clear cookie
		jbundle.gui.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.gui, "handleLogin");
		jbundle.remote.login(jbundle.getTaskSession(), null, null);

		jbundle.util.lastCommand = "?menu=";
		jbundle.util.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.util, "doLoginCommand");
	},
	// Add a new send message queue
	addSendQueue: function(filter)
	{
		if (!filter)
			filter = new Object();
		if (filter.queueName == null)
			filter.queueName = jbundle.TRX_SEND_QUEUE;
		if (filter.queueType == null)
			filter.queueType = jbundle.DEFAULT_QUEUE_TYPE;
		if (jbundle.getTaskSession().getSendQueue(filter.queueName, filter.queueType))
			return;	// The queue already exists.
		var sendQueue = new jbundle.classes.SendQueue(jbundle.getTaskSession(), filter.queueName, filter.queueType);
		if (jbundle.getTaskSession().sessionID)	// Only add if the remote task session exists (otherwise this will be called automatically)
			jbundle.remote.createRemoteSendQueue(sendQueue);
		return sendQueue;
	},
	// Add a new receive message queue
	addReceiveQueue: function(filter)
	{
		if (!filter)
			filter = new Object();
		if (filter.queueName == null)
			filter.queueName = jbundle.TRX_RECEIVE_QUEUE;
		if (filter.queueType == null)
			filter.queueType = jbundle.DEFAULT_QUEUE_TYPE;
		if (jbundle.getTaskSession().getReceiveQueue(filter.queueName, filter.queueType))
			return;	// The queue already exists.
	  	var receiveQueue = new jbundle.classes.ReceiveQueue(jbundle.getTaskSession(), filter.queueName, filter.queueType);
		if (jbundle.getTaskSession().sessionID)	// Only add if the remote task session exists (otherwise this will be called automatically)
			jbundle.remote.createRemoteReceiveQueue(receiveQueue);
		return receiveQueue;
	},
	// Send a message
	sendMessage: function(message)
	{
		if (message.queueName == null)
			message.queueName = jbundle.TRX_SEND_QUEUE;
		if (message.queueType == null)
			message.queueType = jbundle.DEFAULT_QUEUE_TYPE;
		var sendQueue = jbundle.getTaskSession().getSendQueue(message.queueName, message.queueType);
		if (!sendQueue)
			sendQueue = jbundle.util.addSendQueue(message);
		jbundle.remote.sendMessage(sendQueue, message.data);
	},
	// Add a message listener to this receive queue
	addMessageListener: function(filter)
	{
		if (filter.queueName == null)
			filter.queueName = jbundle.TRX_RECEIVE_QUEUE;
		if (filter.queueType == null)
			filter.queueType = jbundle.DEFAULT_QUEUE_TYPE;
		var receiveQueue = jbundle.getTaskSession().getReceiveQueue(filter.queueName, filter.queueType);
		if (!receiveQueue)
			receiveQueue = jbundle.util.addReceiveQueue(filter);
		var messageFilter = new jbundle.classes.MessageFilter(receiveQueue, filter.onMessage);
		if (receiveQueue.sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			jbundle.remote.addRemoteMessageFilter(messageFilter);
	},
	/*
	 * Display an error message.
	 */
	displayErrorMessage: function(message)
	{
		if (jbundle.gui)
			jbundle.gui.displayErrorMessage(message);
		else
			alert(message);	// Note: Do something else here.
	},
	// Handle an onClick in an <a> link
	handleLink: function(link)
	{
		if (link)
		{
			var command = link.href;
			if (command)
				return jbundle.util.doCommand(command);	// Link handled, don't follow link
		}
		return true;	// Link not handled by me, so follow link
	},
	// Do this screen link command
	doLink: function(command)
	{
		jbundle.util.doCommand(command);
	},
	// Do this screen button command
	doButton: function(command)
	{
		if (command.indexOf("?") == -1)
			command = "command=" + command;
		jbundle.util.doCommand(command);
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
		if ((command.indexOf("Login") != -1) || (jbundle.java.getProperty(command, "user") == ''))
		{
			var user = jbundle.java.getProperty(command, "user");
			if (user == "")
				user = null;
			if (user == null)
			{
				if (jbundle.getTaskSession().security)
					if (jbundle.getTaskSession().security.userProperties)
						if (jbundle.getTaskSession().security.userProperties.user)
							user = jbundle.getTaskSession().security.userProperties.user;
				if ((user == "1") || (user == ""))
					user = null;
			}
			if (user == null)
				jbundle.gui.displayLogonDialog();
			else
				jbundle.util.logout();
		}
		else if (command.indexOf("preferences=") != -1)
		{
			var navmenus = jbundle.java.getProperty(command, "navmenus");
			if (navmenus)
				jbundle.gui.changeNavMenus(navmenus);
		}
		else if (jbundle.java.getProperty(command, "help") != null)
		{
			if (jbundle.util.lastCommand)
				if (jbundle.java.getProperty(command, "class") != null)
					command = jbundle.util.lastCommand + "&help=";
			jbundle.util.doScreen(command, addHistory);
		}
		else if (((jbundle.java.getProperty(command, "screen") != null)
			|| (jbundle.java.getProperty(command, "menu") != null)
			|| (jbundle.java.getProperty(command, "xml") != null)
			|| (jbundle.java.getProperty(command, "record") != null))
			&& (jbundle.java.getProperty(command, "applet") == null))
		{
			if ((jbundle.java.getProperty(command, "user") != null)
				&& (jbundle.java.getProperty(command, "user").length > 0)
				&& ((jbundle.util.user == null) || (jbundle.util.user.length == 0) || (jbundle.util.user != jbundle.java.getProperty(command, "user"))))
			{	// Special case - sign on before doing command.
				var user = jbundle.java.getProperty(command, "user");
				var password = jbundle.java.getProperty(command, "auth");

				jbundle.gui.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.gui, "handleLogin");
				jbundle.util.lastCommand = command;
				jbundle.util.handleLoginLink = dojo.connect(jbundle.remote, "handleLogin", jbundle.util, "doLoginCommand");
				jbundle.remote.login(jbundle.getTaskSession(), user, password);
			}
			else
			{
				jbundle.util.lastCommand = command;	// TODO (don) This logic is very weak
				jbundle.util.doScreen(command, addHistory);
			}
		}
		else if (jbundle.java.getProperty(command, "command"))
		{
			jbundle.util.doLocalCommand(command, addHistory);
		}
		else if (jbundle.java.getProperty(command, "applet") != null)
		{
			javaApplet = null;
			if (jbundle.getTaskSession().security != null)	// Signed on
				javaApplet = jbundle.getTaskSession().security.userProperties.javaApplet;
			if ((!javaApplet) || ((javaApplet.indexOf('J') == 0) || (javaApplet.indexOf('Y') == 0)))
			{	// Display an applet
				// Note: For now I do not render an applet page, I jump to a new applet page (Since I can't figure out how to run js in xsl)
				if (jbundle.gui.displayApplet(command) == true)
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
	handleLoginLink: null,
	// After logging into a new account, process the command.
	doLoginCommand: function()
	{
		dojo.disconnect(jbundle.util.handleLoginLink);

		var command = jbundle.util.lastCommand;
		if (jbundle.java.getProperty(command, "user") != null)
		{	// strip out user param
			var iStart = command.indexOf("user=");
			var iEnd = command.indexOf("&", iStart);
			if (iEnd == -1)
				command = command.substring(0, iStart - 1);
			else
				command = command.substring(0, iStart - 1) + command.substring(iEnd);
		}
		jbundle.util.lastCommand = command;	// Make sure this is the 'last' command
		if ((command) && (command != ""))
			jbundle.util.doCommand(command, false, false);		
	},
	/*
	 * Local commands are formatted commmand=xyz
	 */
	doLocalCommand: function(command, addHistory)
	{
		var commandTarget = jbundle.java.getProperty(command, "command");
		console.log("do local command: " + command);
		if (commandTarget == "Back")
		{
			parent.frames[0].history.back();
		}
		else if (commandTarget == "Submit")
		{
			jbundle.util.submitData(commandTarget);
		}
		else if (commandTarget == "Reset")
		{
			jbundle.gui.clearFormData();
		}
		else if (commandTarget == "Delete")
		{
			jbundle.util.deleteData(command);
		}
		else if ((commandTarget == "FormLink")
			|| (commandTarget == "Form")
			|| (commandTarget == "Link"))
		{
			jbundle.util.doScreen(command, addHistory);
		}
		else
		{
			jbundle.util.submitData(commandTarget);
		}
	},
	/**
	 * Submit the form data to the screen.
	 */
	submitData: function(command) {
		var messageFilter = new jbundle.classes.MessageFilter(jbundle.util.getAjaxSession(), jbundle.util.doRemoteSubmitCallback);
		messageFilter.name = command;
		messageFilter.properties = jbundle.gui.getFormData();
		if (jbundle.util.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
		{
			jbundle.gui.waitCursor();
			jbundle.remote.doRemoteAction(messageFilter);
		}
	},
	/**
	 * Handle the XML coming back from the menu action.
	 */
	doRemoteSubmitCallback: function(data, ioArgs)
	{
		var bSuccess = jbundle.util.handleReturnData(data, ioArgs);
		if (bSuccess == true)
			jbundle.gui.clearFormData();
		jbundle.gui.restoreCursor();
	},
	/**
	 * Submit the form data to the screen.
	 */
	deleteData: function(command) {
		var messageFilter = new jbundle.classes.MessageFilter(jbundle.util.getAjaxSession(), jbundle.util.doRemoteDeleteCallback);
		messageFilter.name = command;
		if (jbundle.gui.isForm())
			messageFilter.properties = jbundle.gui.getFormData(true);	// Hidden fields
		if (jbundle.util.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			jbundle.remote.doRemoteAction(messageFilter);
	},
	/**
	 * Handle the XML coming back from the menu action.
	 */
	doRemoteDeleteCallback: function(data, ioArgs)
	{
		var bSuccess = jbundle.util.handleReturnData(data, ioArgs);
		if (bSuccess == true)
		{
			if (jbundle.gui.isForm())
			{
				jbundle.gui.clearFormData();
			}
			else
			{
				if (ioArgs)
					if (ioArgs.args)
						if (ioArgs.args.content)
							if (ioArgs.args.content.name)
				jbundle.gui.clearGridData(jbundle.java.getProperty(ioArgs.args.content.name, "objectID"));
			}
		}
	},
	/**
	 * Get my ajax session.
	 */
	getAjaxSession: function()
	{
		if (!jbundle.util.jsSession)
			jbundle.util.jsSession = jbundle.util.makeRemoteSession(".main.remote.AjaxScreenSession");
		return jbundle.util.jsSession;
	},
	jsSession: null,
	/**
	 * Do this screen command.
	 */
	doScreen: function(command, addHistory)
	{
		console.log("do screen: " + command);
		var messageFilter = new jbundle.classes.MessageFilter(jbundle.util.getAjaxSession(), jbundle.util.doRemoteScreenActionCallback);
		messageFilter.bindArgs = {
			addHistory: addHistory
		};
		messageFilter.name = "createScreen";
		messageFilter.properties = jbundle.java.commandToProperties(command);
		if (jbundle.util.getAjaxSession().sessionID)	// Only add the physical remote filter if the receive queue is set up, otherwise the filter will be set up later
			jbundle.remote.doRemoteAction(messageFilter);
	},
	// Handle the XML coming back from the menu action
	doRemoteScreenActionCallback: function(data, ioArgs)
	{
		jbundle.util.handleReturnData(data, ioArgs);
	},
	// Handle the XML coming back from the menu action
	// Return true if success (non-error return)
	handleReturnData: function(data, ioArgs)
	{
		var domToBeTransformed = dojox.data.dom.createDocument(data);
		var info = domToBeTransformed.getElementsByTagName("status-text");
		if (info)
			if (info.length > 0)
				if (info[0].parentNode == domToBeTransformed)
		{
			if (jbundle.util.checkCommand(info[0]))
				return true;
			var infoLevel = jbundle.util.handleScreenInfoMessage(info[0]);
			return (infoLevel != "error");	// Only return false if error level
		}

		var domToAppendTo = document.getElementById("content-area");
		var contentParent = domToAppendTo.parentNode;
		// First, delete all the old nodes
		jbundle.gui.removeChildren(domToAppendTo, true);	// Note: I remove the node also since the replacement's root is <div id='content-area'>
		// Then, add the new nodes (via xslt)
		var desc = jbundle.gui.changeTitleFromData(domToBeTransformed);
		if (ioArgs)
			if (ioArgs.args.addHistory)
		{
			var command = ioArgs.args.content.name;
			var bookmark = jbundle.java.propertiesToCommand(ioArgs.args.content.properties);
			var appState = new jbundle.util.ApplicationState(command, bookmark, data);
			dojo.back.addToHistory(appState);
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
			xsltURI = "docs/styles/xsl/ajax/base/menus-ajax.xsl";
		xsltURI = jbundle.getServerPath(xsltURI);
		jbundle.xml.doXSLT(domToBeTransformed, xsltURI, contentParent, jbundle.gui.fixNewDOM);
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
			jbundle.util.doCommand(command);
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
			jbundle.gui.displayLogonDialog(null, null, infoText, jbundle.util.lastCommand);	// Repeat the last command
		else if (error == ACCESS_DENIED)
			jbundle.gui.displayErrorMessage(infoText);
		else if (error == CREATE_USER_REQUIRED)
			;	// ?
		else
			jbundle.gui.displayScreenInfoMessage(infoText, infoClass);
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
		var value = jbundle.java.getProperty(document.cookie, name);
		if (value != null)
			value = unescape(value);
		return value;
	},
	// Non-history hash change
	doHashChange: function(command)
	{
		jbundle.util.doCommand(this.command, true, false);
	}
};
/*
ApplicationState is an object that represents the application state.
It will be given to dojo.undo.browser to represent the current application state.
*/
jbundle.util.ApplicationState = function(screenCommand, bookmarkValue, stateData) {
	this.command = screenCommand;
	this.data = stateData;
	if (bookmarkValue)	// The browser URL to change
		this.changeUrl = bookmarkValue;
};

jbundle.util.ApplicationState.prototype.back = function() {
	if (jbundle.java)
		if (jbundle.java.isJavaWindow())
			jbundle.java.prepareWindowForApplet(false);		// Change from applet display
	if (this.data)
		jbundle.util.doRemoteScreenActionCallback(this.data);
	else
		jbundle.util.doCommand(this.command, true, false);
};

jbundle.util.ApplicationState.prototype.forward = function() {
	if (jbundle.java)
		if (jbundle.java.isJavaWindow())
			jbundle.java.prepareWindowForApplet(false);		// Change from applet display
	if (this.data)
		jbundle.util.doRemoteScreenActionCallback(this.data);
	else
		jbundle.util.doCommand(this.command, true, false);
};


dojo.addOnLoad(jbundle.util, "init");

}
