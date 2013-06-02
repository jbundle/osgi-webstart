/**
 * Remote access utilities.
 */
define([
	"jbundle/main",
	"jbundle/gui",
	"jbundle/classes",
	"dojox/data/dom",
	"dojo/request",
	"dojo/_base/json"
], function(main, gui, classes, dom, request, json) {
    return {
	/**
	 * Send this command to the web server and bind the return to this function.
	 */
	sendToAjax: function(remoteCommand, data, bindFunction, url, mimetype, bindArgs) {
		if (!data)
			data = {};
		if (remoteCommand)
			data.remoteCommand = remoteCommand;
		if (!url)
			url = main.getServerPath();
		//?if (!mimetype)
		//?	mimetype = "text/html";
		
		var timeout = 30 * 1000;	// 30 seconds max
		if (remoteCommand == "receiveRemoteMessage")
			timeout = 180 * 1000;	// 3 minutes

		if (!bindArgs)
			bindArgs = {};
		bindArgs.data = data;
		if (mimetype)
			bindArgs.headers = {"Content-Type": mimetype};
		bindArgs.timeout = timeout;
		bindArgs.ioArgs = data;
		
	    request.post(url, bindArgs, bindFunction).response.then(
            	bindFunction,
            function(response){
        		require(["jbundle/remote"], function(remote) {
                	remote.transportError(response);
    	    	});
            }
	    );
	    // dojo.xhrPost(bindArgs);
	  	if (dojoConfig.isDebug)
		  	console.log("Called " + remoteCommand);
	},
	/**
	 * Transport error.
	 */
	transportError: function(response) {
		var data = response.message;
		var dataIn = response.response.data;
		var displayError = main.gEnvState;
		if (response.response)
			if (response.response.options)
			if (response.response.options.ioArgs)
			if (response.response.options.ioArgs.remoteCommand)
				if (response.response.options.ioArgs.remoteCommand == "receiveRemoteMessage")
				{
					displayError = false;
					if (response.message == "Timeout exceeded")	{
						//?ioArgs.xhr.abort();
						this.receiveRemoteMessage(main.getTaskSession().getSessionByFullSessionID(response.response.data));	// Wait for the next message.
					}
				}
		if (displayError == true)	// Ignore the error if the user moves away from this window
			gui.displayErrorMessage("Transport error: " + response.message + "\nArgs: " + response.response.data.toString());
	},
	// ------- ApplicationServer --------
	/**
	 * Create the remote task.
	 */
	createRemoteTask: function(props) {
		var args = {};
		args.properties = json.toJson(props);

		this.sendToAjax("createRemoteTask", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleCreateRemoteTask(response);
	    	});
		  });
	},
	/**
	 * Handle create remote task call
	 */
	handleCreateRemoteTask: function(response) {
//		require(["jbundle/main", "jbundle/remote", "jbundle/classes"], function(main, remote, classes) {

			var data = response.data;
	
			if (this.checkForDataError(data, "Could not create remote task"))
				return;
		  	if (dojoConfig.isDebug)
			  	console.log("handleCreateRemoteTask session " + data);
			main.getTaskSession().sessionID = data;
		
			// If there are any queues for this new task, add them to the remote queue now
			var childSessions = main.getTaskSession().childSessions;
			if (childSessions)
			{
				for (var i = 0; i < childSessions.length; i++)
				{
					if (childSessions[i] instanceof classes.SendQueue)
						this.createRemoteSendQueue(childSessions[i]);
					if (childSessions[i] instanceof classes.ReceiveQueue)
						this.createRemoteReceiveQueue(childSessions[i]);
					if (childSessions[i] instanceof classes.Session)
						this.makeRemoteSession(childSessions[i]);
				}
			}
//		});
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

		this.sendToAjax("freeRemoteSession", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleFreeRemoteSession(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleFreeRemoteSession: function(response) {
		var data = response.data;
//x		if (this.checkForDataError(data, "Could not free remote session"))
//x			return;
		// TODO (don) Free/remove the session and set gTaskSession to null if IT was freed
	  	if (dojoConfig.isDebug)
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

		this.sendToAjax("makeRemoteSession", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleMakeRemoteSession(response);
	    	});
		  });
	},
	/**
	 * Handle make remote session call
	 */
	handleMakeRemoteSession: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not create remote session"))
			return;
		var session = main.getTaskSession().getSessionByLocalSessionID(response.options.ioArgs.localSessionID);
	
	  	if (dojoConfig.isDebug)
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
		    	this.doRemoteAction(session.remoteFilters[key]);
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
				args.properties = json.toJson(messageFilter.properties);

		this.sendToAjax("doRemoteAction", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleDoRemoteAction(response);
	    	});
		  }, null, null, messageFilter.bindArgs);
	},
	/**
	 * Handle do remote action call
	 */
	handleDoRemoteAction: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not do remote action", true))
			return;
		if (dojoConfig.isDebug)
			console.log("handleDoRemoteAction, data received: " + data);
		var messageFilter = main.getTaskSession().getSessionByFullSessionID(response.options.ioArgs.target).getMessageFilter(response.options.ioArgs.filter);
		try {
//?			if ((data) && (data.length > 0) && (data.charAt(0) == '(') && (data.charAt(data.length - 1) == ')'))
//?				data = eval(data);
			messageFilter.methodToCall(data, response.options.ioArgs);
		} catch (e) {
	  		gui.displayErrorMessage("Error: " + e.message);
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

		this.sendToAjax("createRemoteSendQueue", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleCreateRemoteSendQueue(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleCreateRemoteSendQueue: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not create remote send queue"))
			return;
	  	if (dojoConfig.isDebug)
		  	console.log("createRemoteSendQueue session " + data);
		main.getTaskSession().getSendQueue(response.options.ioArgs.queueName, response.options.ioArgs.queueType).sessionID = data;
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

		this.sendToAjax("createRemoteReceiveQueue", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleCreateRemoteReceiveQueue(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleCreateRemoteReceiveQueue: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not create remote receive queue"))
			return;
		var receiveQueue = main.getTaskSession().getReceiveQueue(response.options.ioArgs.queueName, response.options.ioArgs.queueType);
	
	  	if (dojoConfig.isDebug)
		  	console.log("createRemoteReceiveQueue session " + data);
		receiveQueue.sessionID = data;
		
		// If there are any filters for this new receive queue, add them to the remote queue now
		for (var key in receiveQueue.remoteFilters) {
	    	this.addRemoteMessageFilter(receiveQueue.remoteFilters[key]);
		}

		this.receiveRemoteMessage(main.getTaskSession().getReceiveQueue(response.options.ioArgs.queueName, response.options.ioArgs.queueType));	// Wait for the next message.
	},
	/**
	 * Login.
	 */
	login: function(session, props) {
		if (!props)
			props = {};
		if (!props.user)
			props.user = "";
		if (!props.password)
			props.password = "";
		props.target = session.getFullSessionID(),

		this.sendToAjax("login", props, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleLogin(response);
	    	});
		  });
	},
	/**
	 * Handle login call
	 */
	handleLogin: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not log in"))
			return;
		data = eval(data);
	  	if (dojoConfig.isDebug)
		  	console.log("Login ok ");
		main.getTaskSession().security = data;
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

		this.sendToAjax("addRemoteMessageFilter", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleAddRemoteMessageFilter(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleAddRemoteMessageFilter: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, "Could not add remote message filter"))
			return;
	  	if (dojoConfig.isDebug)
		  	console.log("handleAddRemoteMessageFilter to filter " + data);
		var messageFilter = main.getTaskSession().getSessionByFullSessionID(ioArgs.args.content.target).getMessageFilter(ioArgs.args.content.filter);
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
	
		this.sendToAjax("receiveRemoteMessage", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleReceiveMessage(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleReceiveMessage: function(response) {
		var data = response.data;
		if (this.checkForDataError(data, null))
		{
			// Ignore receive data errors.
		}
		else
		{
			try {
				data = eval(data);
			  	if (dojoConfig.isDebug)
				  	console.log("receiveRemoteMessage to filter " + data.id + ", message: " + data.message);
				main.getTaskSession().getReceiveQueue(data.queueName, data.queueType).getMessageFilterByRemoteID(data.id).methodToCall(data.message);
			} catch (e) {
		  		gui.displayErrorMessage("Error: " + e.description);
			}
		}
		this.receiveRemoteMessage(main.getTaskSession().getReceiveQueue(data.queueName, data.queueType));	// Wait for the next message.
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
	
		this.sendToAjax("sendMessage", args, function(response) {
    		require(["jbundle/remote"], function(remote) {
	    	    remote.handleSendMessage(response);
	    	});
		  });
	},
	/**
	 *
	 */
	handleSendMessage: function(response) {
		var data = response.data;

	  	if (dojoConfig.isDebug)
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
				gui.displayErrorMessage(errorText);
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
						gui.displayErrorMessage(errorText);
						return true;
					}
				}
		}
		return false;	// No error
	},
  };
});

