/**
 * Top level methods and vars.
 */
if(!dojo._hasResource["jbundle.classes"]){
dojo._hasResource["jbundle.classes"] = true;
dojo.provide("jbundle.classes");

/**
 * Classes.
 */
jbundle.classes = {
	// Top-level task(s)
	Session: function(parentSession) {
		if (parentSession)
		{
			this.parentSession = parentSession;
			parentSession.addChildSession(this);
		}
		this.childSessions = new Array();
		this.localSessionID = jbundle.classes.nextLocalSessionID;
		jbundle.classes.nextLocalSessionID++;
	},
	// Send queue(s)
	SendQueue: function(parentSession, queueName, queueType) {
		this.parentSession = parentSession;
		this.queueName = queueName;
		this.queueType = queueType;
		parentSession.addChildSession(this);
		this.localSessionID = jbundle.classes.nextLocalSessionID;
		jbundle.classes.nextLocalSessionID++;
	},
	// Receive queue(s)
	ReceiveQueue: function(parentSession, queueName, queueType) {
		this.parentSession = parentSession;
		this.queueName = queueName;
		this.queueType = queueType;
		parentSession.addChildSession(this);
		this.remoteFilters = new Object();
		this.localSessionID = jbundle.classes.nextLocalSessionID;
		jbundle.classes.nextLocalSessionID++;
	},
	// Filters in this receive queue.
	MessageFilter: function(parentSession, methodToCall) {
		this.parentSession = parentSession;
		this.methodToCall = methodToCall;
		this.filterID = jbundle.classes.nextFilterID.toString();
		parentSession.addMessageFilter(this, jbundle.classes.nextFilterID.toString());
		jbundle.classes.nextFilterID++;
	},
	// Next unique local message filter ID
	nextFilterID: 1,
	// Next unique local session ID
	nextLocalSessionID: 1,
	// Utility function to get the full session ID (don't call this directly, it is a session function)
	getFullSessionID: function() {
		var sessionID = this.sessionID;
		if (sessionID)
			if (this.parentSession)
				sessionID = this.parentSession.getFullSessionID() + "/" + sessionID;
		return sessionID;
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
	}
};
jbundle.classes.Session.prototype.getFullSessionID = jbundle.classes.getFullSessionID;
jbundle.classes.Session.prototype.addMessageFilter = jbundle.classes.addMessageFilter;
jbundle.classes.Session.prototype.getMessageFilter = jbundle.classes.getMessageFilter;
jbundle.classes.Session.prototype.addChildSession = function(session) {
	jbundle.getTaskSession().childSessions.push(session);
};
// Get the remote send queue with this name and type
jbundle.classes.Session.prototype.getSendQueue = function(queueName, queueType)
{
	if (queueName === undefined)
		queueName = jbundle.TRX_SEND_QUEUE;
	if (queueType === undefined)
		queueType = jbundle.DEFAULT_QUEUE_TYPE;
	var childSessions = jbundle.getTaskSession().childSessions;
	if (childSessions)
	{
		for (var i = 0; i < childSessions.length; i++)
		{
			if (childSessions[i] instanceof jbundle.classes.SendQueue)
				if (childSessions[i].queueName == queueName)
					if (childSessions[i].queueType == queueType)
						return childSessions[i];
		}
	}
};
// Get the remote receive queue with this name and type
jbundle.classes.Session.prototype.getReceiveQueue = function(queueName, queueType)
{
	if (queueName === undefined)
		queueName = jbundle.TRX_RECEIVE_QUEUE;
	if (queueType === undefined)
		queueType = jbundle.DEFAULT_QUEUE_TYPE;
	var childSessions = jbundle.getTaskSession().childSessions;
	if (childSessions)
	{
		for (var i = 0; i < childSessions.length; i++)
		{
			if (childSessions[i] instanceof jbundle.classes.ReceiveQueue)
				if (childSessions[i].queueName == queueName)
					if (childSessions[i].queueType == queueType)
						return childSessions[i];
		}
	}
};
// Lookup session by session ID
jbundle.classes.Session.prototype.getSessionByFullSessionID = function(fullSessionID) {
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
			if (this.childSessions[i] instanceof jbundle.classes.Session)
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
}
// Lookup session by session ID
jbundle.classes.Session.prototype.getSessionByLocalSessionID = function(localSessionID) {
	if (!this.childSessions)
		return;	// No children, Not found
	for (var i = 0; i < this.childSessions.length; i++)
	{
		if (this.childSessions[i].localSessionID == localSessionID)
			return this.childSessions[i];
		else if (this.childSessions[i] instanceof jbundle.classes.Session)
		{	// Continue looking down the chain
			var session = this.childSessions[i].getSessionByLocalSessionID(localSessionID);
			if (session)
				return session;
		}
	}
	// Not found
}
jbundle.classes.SendQueue.prototype.getFullSessionID = jbundle.classes.getFullSessionID;
jbundle.classes.ReceiveQueue.prototype.addMessageFilter = jbundle.classes.addMessageFilter;
jbundle.classes.ReceiveQueue.prototype.getMessageFilter = jbundle.classes.getMessageFilter;
jbundle.classes.ReceiveQueue.prototype.getMessageFilterByRemoteID = function(remoteFilterID) {
	for (var key in this.remoteFilters) {
    	if (this.remoteFilters[key].remoteFilterID == remoteFilterID)
    		return this.remoteFilters[key];
	}
};
jbundle.classes.ReceiveQueue.prototype.getFullSessionID = jbundle.classes.getFullSessionID;
}
