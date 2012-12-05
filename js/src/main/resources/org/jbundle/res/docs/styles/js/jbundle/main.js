/**
 * Top level methods and vars.
 */
if(!dojo._hasResource["jbundle.main"]){
dojo._hasResource["jbundle.main"] = true;
dojo.provide("jbundle.main");

// dojo.require("dojo.crypto.SHA1");

jbundle = {
    TRX_SEND_QUEUE: "trxSend",          // The generic queue for remote sent transaction messages.
    TRX_RECEIVE_QUEUE: "trxReceive",    // The generic queue for received remote transaction messages.
	DEFAULT_QUEUE_TYPE: "intranet",
	SERVER_PATH: "",					// The RELATIVE server path to the AJAX servlet. (change this if different)
	SERVER_NAME: "ajax",				// The RELATIVE server path to the AJAX servlet. (change this if different)

	// Global session
	gTaskSession: null,
	// State of the environment (true = started, false = stopped)
	gEnvState: null,
	
	getTaskSession: function() {
		return jbundle.gTaskSession;
	},
	getServerPath: function(filePath) {
		if (!filePath)
			filePath = jbundle.SERVER_NAME;
		return jbundle.SERVER_PATH + filePath;
	},
	// Debug mode
	debug: true,
	
	IE: false,
	NS: true,
	// Which browser?
	whichBrowser: function()
	{
		if (document.implementation && document.implementation.createDocument)	// True for non-IE
			return jbundle.NS;
		else if (window.ActiveXObject)
			return jbundle.IE;
		else
			return null;
	}
};
}
