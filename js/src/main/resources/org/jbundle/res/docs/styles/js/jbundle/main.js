/**
 * Top level methods and vars.
 */

define([
], function(dom){
    return {
    	
		getTaskSession: function() {
			return this.gTaskSession;
		},
		getServerPath: function(filePath) {
			if (!filePath)
				filePath = this.SERVER_NAME;
			return this.SERVER_PATH + filePath;
		},
		// Get the next filter ID (and bump the counter)
		getNextFilterID: function()
		{
			return this.nextFilterID++;
		},
		// Get the next filter ID (and bump the counter)
		getNextLocalSessionID: function()
		{
			return this.nextLocalSessionID++;
		},
		SERVER_PATH: "",			// The RELATIVE server path to the AJAX servlet. (change this if different)
		SERVER_NAME: "ajax",		// The RELATIVE server path to the AJAX servlet. (change this if different)
		gTaskSession: null,			// Global session
		gEnvState: null,			// State of the environment (true = started, false = stopped)
    	// Next unique local message filter ID
    	nextFilterID: 0,
    	// Next unique local session ID
    	nextLocalSessionID: 0,

    	TRX_SEND_QUEUE: "trxSend",		// The generic queue for remote sent transaction messages.
    	TRX_RECEIVE_QUEUE: "trxReceive",	// The generic queue for received remote transaction messages.
    	DEFAULT_QUEUE_TYPE: "intranet",
    };
});
