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
