/**
 * Classes.
 */
define([
    	"jbundle/main",
    	"dojo/_base/declare"
], function(main, declare) {
    var classes = {
    };
    // A remote session
    classes.Session =
    		declare(null, {
    			// The constructor
    			constructor: function(parentSession) {
    				if (parentSession)
    				{
    					this.parentSession = parentSession;
    					parentSession.addChildSession(this);
    				}
    				this.childSessions = new Array();
    				this.localSessionID = main.getNextLocalSessionID();
    			},
    			// Utility function to add a filter to this session
    			addMessageFilter: function(messageFilter, filterID) {
    				if (!this.remoteFilters)
    					this.remoteFilters = new Object();
    				this.remoteFilters[filterID] = messageFilter;
    			},
    			// Utility function to get the filter in this session
    			getMessageFilter: function(filterID) {
    				if (this.remoteFilters)
    					return this.remoteFilters[filterID];
    			},
    			addChildSession: function(session) {
    				main.getTaskSession().childSessions.push(session);
    			},
    			// Get the remote send queue with this name and type
    			getSendQueue: function(queueName, queueType)
    			{
    				if (queueName === undefined)
    					queueName = jbundle.TRX_SEND_QUEUE;
    				if (queueType === undefined)
    					queueType = jbundle.DEFAULT_QUEUE_TYPE;
    				var childSessions = main.getTaskSession().childSessions;
    				if (childSessions)
    				{
    					for (var i = 0; i < childSessions.length; i++)
    					{
    						if (childSessions[i].queueName)
    							if (childSessions[i].queueName == queueName)
    								if (childSessions[i].queueType == queueType)
    		    						if (!childSessions[i].remoteFilters)	// instanceof SendSession
    		    							return childSessions[i];
    					}
    				}
    			},
    			// Get the remote receive queue with this name and type
    			getReceiveQueue: function(queueName, queueType)
    			{
    				if (queueName === undefined)
    					queueName = jbundle.TRX_RECEIVE_QUEUE;
    				if (queueType === undefined)
    					queueType = jbundle.DEFAULT_QUEUE_TYPE;
    				var childSessions = main.getTaskSession().childSessions;
    				if (childSessions)
    				{
    					for (var i = 0; i < childSessions.length; i++)
    					{
    						if (childSessions[i].remoteFilters)	// instanceof ReceiveSession
    							if (childSessions[i].queueName == queueName)
    								if (childSessions[i].queueType == queueType)
    									return childSessions[i];
    					}
    				}
    			},
    			// Lookup session by session ID
    			getSessionByFullSessionID: function(fullSessionID)
    			{
    				var sessionID = fullSessionID;
    				if (fullSessionID.indexOf("/") > 0)
    				{	// Next session
    					sessionID = fullSessionID.substr(0, fullSessionID.indexOf("/"));
    					fullSessionID = fullSessionID.substr(fullSessionID.indexOf("/") + 1);
    				}
    				else
    				{
    					sessionID = fullSessionID;
    					fullSessionID = null;	// Last time
    				}
    				if (this.sessionID == sessionID)
    				{
    					if (fullSessionID == null)
    						return this;		// Found
    					if (!this.childSessions)
    						return;	// No more children, Not found
    					for (var i = 0; i < this.childSessions.length; i++)
    					{
    						if (this.childSessions[i].childSessions)
    						{
    							var session = this.childSessions[i].getSessionByFullSessionID(fullSessionID);
    							if (session)
    								return session;
    						}
    						else
    						{	// Send and receive queues are special sessions that can't have children
    							if (this.childSessions[i].sessionID == fullSessionID)
    								return this.childSessions[i];
    						}
    					}
    				}
    				// Not found
    			},
    			// Lookup session by session ID
    			getSessionByLocalSessionID: function(localSessionID) {
    				if (!this.childSessions)
    					return;	// No children, Not found
    				for (var i = 0; i < this.childSessions.length; i++)
    				{
    					if (this.childSessions[i].localSessionID == localSessionID)
    						return this.childSessions[i];
    					else if (this.childSessions[i].childSessions)
    					{	// Continue looking down the chain
    						var session = this.childSessions[i].getSessionByLocalSessionID(localSessionID);
    						if (session)
    							return session;
    					}
    				}
    				// Not found
    			},
    			getFullSessionID: function() {
    				var sessionID = this.sessionID;
    				if (sessionID)
    					if (this.parentSession)
    						sessionID = this.parentSession.getFullSessionID() + "/" + sessionID;
    				return sessionID;
    			},
    		});
	// Send queue(s)
    classes.SendQueue =
		declare(classes.Session, {
			// The constructor
			constructor: function(parentSession, queueName, queueType) {
				this.parentSession = parentSession;
				this.queueName = queueName;
				this.queueType = queueType;
				if (parentSession)
					parentSession.addChildSession(this);
				this.localSessionID = main.getNextLocalSessionID();
				},
    			// Utility function to get the full session ID (don't call this directly, it is a session function)
			});
	// Receive queue(s)
    classes.ReceiveQueue =
		declare(classes.Session, {
			// The constructor
			constructor: function(parentSession, queueName, queueType) {
					this.parentSession = parentSession;
					this.queueName = queueName;
					this.queueType = queueType;
    				if (parentSession)
    					parentSession.addChildSession(this);
					this.remoteFilters = new Object();
					this.localSessionID = main.getNextLocalSessionID();
				},
			getMessageFilterByRemoteID: function(remoteFilterID) {
					for (var key in this.remoteFilters) {
				    	if (this.remoteFilters[key].remoteFilterID == remoteFilterID)
				    		return this.remoteFilters[key];
					}
				},
			});
	// Filters in this receive queue.
    classes.MessageFilter =
		declare(classes.Session, {
			// The constructor
			constructor: function(parentSession, methodToCall) {
					this.parentSession = parentSession;
					this.methodToCall = methodToCall;
					this.filterID = main.getNextFilterID().toString();
					parentSession.addMessageFilter(this, this.filterID);
				},
			});
    
    return classes;
});

