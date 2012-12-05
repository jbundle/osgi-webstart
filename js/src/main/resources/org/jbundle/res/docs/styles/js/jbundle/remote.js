/**
 * Top level methods and vars.
 */
if(!dojo._hasResource["jbundle.remote"]){
dojo._hasResource["jbundle.remote"] = true;
dojo.provide("jbundle.remote");

/**
 * Remote access utilities.
 */
jbundle.remote = {
	/**
	 * Send this command to the web server and bind the return to this function.
	 */
	sendToAjax: function(remoteCommand, args, bindFunction, url, mimetype, bindArgs) {
		if (!args)
			args = new Object();
		if (remoteCommand)
			args.remoteCommand = remoteCommand;
		if (!url)
			url = jbundle.getServerPath();
		if (!mimetype)
			mimetype = "text/html";
		
		var timeout = 30 * 1000;	// 30 seconds max
		if (remoteCommand == "receiveRemoteMessage")
			timeout = 180 * 1000;	// 3 minutes

		if (!bindArgs)
			bindArgs = {};
		bindArgs.url = url;
		bindArgs.content = args;
		bindArgs.mimetype = mimetype;
		bindArgs.load = bindFunction;
		bindArgs.error = jbundle.remote.transportError;
		bindArgs.timeout = timeout;
//			timeout: jbundle.remote.timeoutError,	// Now handled by error.
		
		dojo.xhrPost(bindArgs);
	  	if (djConfig.isDebug)
		  	console.log("Called " + remoteCommand);
	},
	/**
	 * Transport error.
	 */
	transportError: function(data, ioArgs) {
		var displayError = jbundle.gEnvState;
		if (ioArgs)
			if (ioArgs.args)
			if (ioArgs.args.content)
				if (ioArgs.args.content.remoteCommand == "receiveRemoteMessage")
				{
					displayError = false;
					if (data.dojoType == "timeout")	{
						ioArgs.xhr.abort();
						jbundle.remote.receiveRemoteMessage(jbundle.getTaskSession().getSessionByFullSessionID(ioArgs.args.content.target));	// Wait for the next message.
					}
				}
		if (displayError == true)	// Ignore the error if the user moves away from this window
			jbundle.util.displayErrorMessage("Transport error: " + data + "\nArgs: " + ioArgs.toSource());
	},
	// ------- ApplicationServer --------
	/**
	 * Create the remote task.
	 */
	createRemoteTask: function(user, password) {
		var args = {};
		var props = {
  			user: user,
			password: password
		};
		args.properties = dojo.toJson(props);

		jbundle.remote.sendToAjax("createRemoteTask", args, jbundle.remote.handleCreateRemoteTask);
	},
	/**
	 *
	 */
	handleCreateRemoteTask: function(data, ioArgs) {
		if (jbundle.remote.checkForDataError(data, "Could not create remote task"))
			return;
	  	if (djConfig.isDebug)
		  	console.log("handleCreateRemoteTask session " + data);
		jbundle.getTaskSession().sessionID = data;
	
		// If there are any queues for this new task, add them to the remote queue now
		var childSessions = jbundle.getTaskSession().childSessions;
		if (childSessions)
		{
			for (var i = 0; i < childSessions.length; i++)
			{
				if (childSessions[i] instanceof jbundle.classes.SendQueue)
					jbundle.remote.createRemoteSendQueue(childSessions[i]);
				if (childSessions[i] instanceof jbundle.classes.ReceiveQueue)
					jbundle.remote.createRemoteReceiveQueue(childSessions[i]);
				if (childSessions[i] instanceof jbundle.classes.Session)
					jbundle.remote.makeRemoteSession(childSessions[i]);
			}
		}
	},
	// ------- RemoteBaseSession --------
    /**
     * Release the session and its resources.
     */
	freeRemoteSession: function(session)
	{
		var args = {
			target: session.getFullSessionID()
		};

		jbundle.remote.sendToAjax("freeRemoteSession", args, jbundle.remote.handleFreeRemoteSession);
	},
	/**
	 *
	 */
	handleFreeRemoteSession: function(data, ioArgs) {
//x		if (jbundle.remote.checkForDataError(data, "Could not free remote session"))
//x			return;
		// TODO (don) Free/remove the session and set gTaskSession to null if IT was freed
	  	if (djConfig.isDebug)
		  	console.log("freeRemoteSession session " + data);
	},
    /**
     * Build a new remote session and initialize it.
     * @param parentSessionObject The parent session for this new session (if null, parent = me).
     * @param strSessionClassName The class name of the remote session to build.
     */
	makeRemoteSession: function(session)
	{
		var args = {
			name: session.sessionClassName,
			target: session.parentSession.getFullSessionID(),
			localSessionID: session.localSessionID
		};

		jbundle.remote.sendToAjax("makeRemoteSession", args, jbundle.remote.handleMakeRemoteSession);
	},
	/**
	 *
	 */
	handleMakeRemoteSession: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not create remote session"))
			return;
		var session = jbundle.getTaskSession().getSessionByLocalSessionID(ioArgs.args.content.localSessionID);
	
	  	if (djConfig.isDebug)
		  	console.log("makeRemoteSession session " + data);
		session.sessionID = data;
		if (data.indexOf(":") > 0)
		{	// Always
			session.sessionID = data.substr(data.indexOf(":") + 1);
			session.sessionType = data.substr(0, data.indexOf(":"));
		}		
		
		// If there are any commands for this new session, add them to the remote queue now
		if (session.remoteFilters)
		{
			for (var key in session.remoteFilters) {
		    	jbundle.remote.doRemoteAction(session.remoteFilters[key]);
			}
		}
	},
	/**
	 * Send this message.
	 */
	doRemoteAction: function(messageFilter)
	{
		var args = {
			target: messageFilter.parentSession.getFullSessionID(),
			filter: messageFilter.filterID,
			name: messageFilter.name,
			properties: messageFilter.properties
		};
		if (messageFilter.properties)
			if (messageFilter.properties instanceof Object)
				args.properties = dojo.toJson(messageFilter.properties);

		jbundle.remote.sendToAjax("doRemoteAction", args, jbundle.remote.handleDoRemoteAction, null, null, messageFilter.bindArgs);
	},
	/**
	 *
	 */
	handleDoRemoteAction: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not do remote action", true))
			return;
		if (djConfig.isDebug)
			console.log("handleDoRemoteAction, data received: " + data);
		var messageFilter = jbundle.getTaskSession().getSessionByFullSessionID(ioArgs.args.content.target).getMessageFilter(ioArgs.args.content.filter);
		try {
//?			if ((data) && (data.length > 0) && (data.charAt(0) == '(') && (data.charAt(data.length - 1) == ')'))
//?				data = eval(data);
			messageFilter.methodToCall(data, ioArgs);
		} catch (e) {
	  		jbundle.util.displayErrorMessage("Error: " + e.message);
		}
	},
	// ------- RemoteTask --------
	/**
	 * Create the send queue.
	 */
	createRemoteSendQueue: function(session)
	{
		var args = {
			queueName: session.queueName,
			queueType: session.queueType,
			target: session.parentSession.getFullSessionID()
		};

		jbundle.remote.sendToAjax("createRemoteSendQueue", args, jbundle.remote.handleCreateRemoteSendQueue);
	},
	/**
	 *
	 */
	handleCreateRemoteSendQueue: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not create remote send queue"))
			return;
	  	if (djConfig.isDebug)
		  	console.log("createRemoteSendQueue session " + data);
		jbundle.getTaskSession().getSendQueue(ioArgs.args.content.queueName, ioArgs.args.content.queueType).sessionID = data;
	},
	/**
	 * Create the receive queue.
	 */
	createRemoteReceiveQueue: function(session)
	{
		var args = {
			queueName: session.queueName,
			queueType: session.queueType,
			target: session.parentSession.getFullSessionID()
		};

		jbundle.remote.sendToAjax("createRemoteReceiveQueue", args, jbundle.remote.handleCreateRemoteReceiveQueue);
	},
	/**
	 *
	 */
	handleCreateRemoteReceiveQueue: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not create remote receive queue"))
			return;
		var receiveQueue = jbundle.getTaskSession().getReceiveQueue(ioArgs.args.content.queueName, ioArgs.args.content.queueType);
	
	  	if (djConfig.isDebug)
		  	console.log("createRemoteReceiveQueue session " + data);
		receiveQueue.sessionID = data;
		
		// If there are any filters for this new receive queue, add them to the remote queue now
		for (var key in receiveQueue.remoteFilters) {
	    	jbundle.remote.addRemoteMessageFilter(receiveQueue.remoteFilters[key]);
		}

		jbundle.remote.receiveRemoteMessage(jbundle.getTaskSession().getReceiveQueue(ioArgs.args.content.queueName, ioArgs.args.content.queueType));	// Wait for the next message.
	},
	/**
	 * Login.
	 */
	login: function(session, user, password) {
		if (!user)
			user = "";
		if (!password)
			password = "";
		var args = {
			target: session.getFullSessionID(),
  			user: user,
			password: password
		};

		jbundle.remote.sendToAjax("login", args, jbundle.remote.handleLogin);
	},
	/**
	 *
	 */
	handleLogin: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not log in"))
			return;
		data = eval(data);
	  	if (djConfig.isDebug)
		  	console.log("Login ok ");
		jbundle.getTaskSession().security = data;
	},
	/**
	 * Add a remote message filter.
	 */
	addRemoteMessageFilter: function(messageFilter)
	{
		var args = {
			target: messageFilter.parentSession.getFullSessionID(),
			filter: messageFilter.filterID
		};

		jbundle.remote.sendToAjax("addRemoteMessageFilter", args, jbundle.remote.handleAddRemoteMessageFilter);
	},
	/**
	 *
	 */
	handleAddRemoteMessageFilter: function(data, ioArgs)
	{
		if (jbundle.remote.checkForDataError(data, "Could not add remote message filter"))
			return;
	  	if (djConfig.isDebug)
		  	console.log("handleAddRemoteMessageFilter to filter " + data);
		var messageFilter = jbundle.getTaskSession().getSessionByFullSessionID(ioArgs.args.content.target).getMessageFilter(ioArgs.args.content.filter);
		messageFilter.remoteFilterID = data;
	},
	/**
	 * Receive a message.
	 */
	receiveRemoteMessage: function(receiveQueue)
	{
		var args = {
			target: receiveQueue.getFullSessionID()
		};
	
		jbundle.remote.sendToAjax("receiveRemoteMessage", args, jbundle.remote.handleReceiveMessage);
	},
	/**
	 *
	 */
	handleReceiveMessage: function(data, ioArgs) {
		if (jbundle.remote.checkForDataError(data, null))
		{
			// Ignore receive data errors.
		}
		else
		{
			try {
				data = eval(data);
			  	if (djConfig.isDebug)
				  	console.log("receiveRemoteMessage to filter " + data.id + ", message: " + data.message);
				jbundle.getTaskSession().getReceiveQueue(data.queueName, data.queueType).getMessageFilterByRemoteID(data.id).methodToCall(data.message);
			} catch (e) {
		  		jbundle.util.displayErrorMessage("Error: " + e.description);
			}
		}
		jbundle.remote.receiveRemoteMessage(jbundle.getTaskSession().getReceiveQueue(data.queueName, data.queueType));	// Wait for the next message.
	},
	/**
	 * Send this message.
	 */
	sendMessage: function(sendQueue, message)
	{
		var args = {
			message: message,
			target: sendQueue.getFullSessionID()
		};
	
		jbundle.remote.sendToAjax("sendMessage", args, jbundle.remote.handleSendMessage);
	},
	/**
	 *
	 */
	handleSendMessage: function(data, ioArgs)
	{
	  	if (djConfig.isDebug)
		  	console.log("sendMessage ok");
		// Don't do anything
	},
	/*
	 * Check to see that this return data is valid
	 */
	checkForDataError: function(data, errorText, ignoreXMLError)
	{
		if ((data == undefined) || (data == null) || (data.length == 0))
		{
			if (errorText)
				jbundle.util.displayErrorMessage(errorText);
			return true;	// Error
		}
		if (!ignoreXMLError)
			if ((data != null) && (data.indexOf("<status-text>") != -1))
		{
			var startErrorText = data.indexOf("<error>");
			var endErrorText = data.indexOf("</error>");
			if ((startErrorText != -1) && (endErrorText > startErrorText))
				if (data.substring(startErrorText + 7, endErrorText) == "error")	// Error level
				{
					startErrorText = data.indexOf("<text>");
					endErrorText = data.indexOf("</text>");
					if ((startErrorText != -1) && (endErrorText > startErrorText))
					{
						errorText = data.substring(startErrorText + 6, endErrorText);
						jbundle.util.displayErrorMessage(errorText);
						return true;
					}
				}
		}
		return false;	// No error
	}
};
}
