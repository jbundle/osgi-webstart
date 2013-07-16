/**
 * Screen utilities.
 */
define("jbundle/gui", [
	"jbundle/java",
	"jbundle/xml",
	"jbundle/thinutil",
	"jbundle/main",
	"dojo/parser",
	"dijit/registry",
	"dijit/Dialog",
	"dijit/Editor",
	"dijit/form/Button",
	"dijit/form/TextBox",
	"dijit/form/CheckBox",
	"dojo/domReady!"
], function(java, xml, thinutil, main, parser, registry, Dialog){
    return {
	/**
	 * Get scratch area.
	 * @return The dom to the scratch area.
	 */
	getScratch: function()
	{
		var domToAppendTo = document.getElementById("scratch");
		if (!domToAppendTo)
		{
			var htmlDom = document.getElementsByTagName("body")[0];
			domToAppendTo = document.createElement("div");
			htmlDom.appendChild(domToAppendTo);
			domToAppendTo.setAttribute("id", "scratch");
		}
		return domToAppendTo;
	},
	/**
	 * Send this message.
	 */
	displayLogonDialog: function(domToAppendTo, user, dialogTitle, command)
	{
		if (!domToAppendTo)
			domToAppendTo = this.getScratch();
		if (!user)
		{
			user = "";
			if (main.getTaskSession())
			if (main.getTaskSession().security)
				if (main.getTaskSession().security.userProperties)
					if (main.getTaskSession().security.userProperties.user)
						user = main.getTaskSession().security.userProperties.user;
		}
		if (!dialogTitle)
			dialogTitle = "Login";
		if (!command)
			command = "";
		var xmlToBeTransformed = "<root><user>" + user + "</user><dialogTitle>" + dialogTitle + "</dialogTitle><command>" + command + "</command></root>";
		var xsltURI = main.getServerPath("org/jbundle/res/docs/styles/js/jbundle/xsl/logon.xsl");

		var logonDialog = registry.byId("logonDialog");
		if (!logonDialog)
		{
			var domToBeTransformed = dojox.data.dom.createDocument(xmlToBeTransformed);
			xml.doXSLT(domToBeTransformed, xsltURI, domToAppendTo, this.handleDisplayLogonDialog);
		}
		else
		{
			var form = document.getElementById("logonForm");
			// TODO (don) Fix 0.9			form.title = dialogTitle;
			form.elements.user.value = user;
			form.elements.password.value = "";
			form.elements.saveUser.checked = true;
			form.elements.command.value = command;

        	logonDialog.show();
		}
		return true;
	},
	doNothing: function()
	{
	},
	/**
	 * After the logon dialog is set up, display it.
	 */
	handleDisplayLogonDialog: function(domToAppendTo)
	{
		parser.parse(domToAppendTo);

		var logonDialog = registry.byId("logonDialog");
       	logonDialog.show();
		return;
	},
	/*
	 * Display an error message.
	 */
	displayErrorMessage: function(message)
	{
		var domToAppendTo = this.getScratch();
		
		var alertDialog = registry.byId("alertDialog");
		if (!alertDialog)
		{
			var params =
				{
					bgColor: "white",
					bgOpacity: "0.5",
					toggle: "fade",
					toggleDuration: "250",
					title: "Error!",
					iconSrc: "org/jbundle/res/images/buttons/Error.gif",
					displayCloseAction: true,
					id: "alertDialog"
				};
			alertDialog = new Dialog(params, domToAppendTo);
		}
		// todo (don) This seems lame
		message = "<div style='text-align: center;'>" + 
			message + 
				"<br/><button id=\"alertDialogOkay\" onClick=\"require(['dijit/registry'], function(registry) {registry.byId('alertDialog').hide();});\" data-dojo-type=\"dijit/form/Button\" class=\"button\" ><img src=\"org/jbundle/res/images/buttons/Close.gif\" width=\"16\" height=\"16\" alt=\"Close\" class=\"button\" />Close</button>" + 
//x				"&#160;&#160;&#160;" +
//x				"<button id=\"alertDialogNewUser\" onClick=\"require(['jbundle/util'], function(util){util.doCommand('?screen=.main.user.screen.UserEntryScreen&amp;java=no');});\" data-dojo-type=\"dijit/form/Button\" class=\"button\" ><img src=\"org/jbundle/res/images/buttons/Form.gif\" width=\"16\" height=\"16\" alt=\"Create new account\" class=\"button\" />Create new account</button>" + 
				"</div>";
		alertDialog.setContent(message);

       	alertDialog.show();

		return true;
	},
	/**
	 * Display this message on the screen (the status of the just-executed command).
	 */
	displayScreenInfoMessage: function(infoText, infoClass)
	{
		var messageArea = document.getElementById('status-area');
		if (messageArea)
		{
			thinutil.removeChildren(messageArea);
			messageArea.appendChild(document.createTextNode(infoText));
			if (!infoClass)
				infoClass = "information";
			messageArea.setAttribute("class", infoClass);
		}
	},
	/**
	 * Switch this button's description and command.
	 */
	changeButton: function(button, desc, command)
	{
		if (!command)
			command = desc;
		var imageName = "<img src=\"org/jbundle/res/images/buttons/" + command + ".gif\" width=\"16\" height=\"16\"/>" + desc;
		if (button)
			button.setLabel(imageName);
	},
	/**
	 * Switch this document's user name.
	 */
	changeUser: function(user)
	{
		if (!user)
			user = "";
		var div = document.getElementById("userName");
		if (div)
		{	// Always
			thinutil.removeChildren(div);
			div.appendChild(document.createTextNode(user));
		}
	},
	/**
	 * Change the screen title.
	 */
	changeTheTitle: function(newtitle)
	{
		if (!newtitle)
			newtitle = "";
		var div = document.getElementById("title");
		if (div)
		{	// Always
			thinutil.removeChildren(div);
			div.appendChild(document.createTextNode(newtitle));
		}
		document.title = newtitle;
	},
	/**
	 * Given the DOM, get the screen title and change it.
	 */
	changeTitleFromData: function(domToBeTransformed)
	{
		var elements = domToBeTransformed.getElementsByTagName("Name");
		var title = null;
		if (elements)
			if (elements.length > 0)
				this.changeTheTitle(title = elements[0].textContent);
		return title;
	},
	/**
	 * Change the nav menus.
	 */
	changeNavMenus: function(navmenus)
	{
		var navStart = document.getElementById("navStart");
		var navStartShadow = document.getElementById("navStartShadow");
		var navStartVShadow = document.getElementById("navStartVShadow");
		var navStartSECorner = document.getElementById("navStartSECorner");
		
		var style = "navStart";
		var styleShadow = "navStartShadow";
		if (navmenus == "IconsOnly")
		{
			if (navStart.className != "navIconsOnlyStart")
				style = "navIconsOnlyStart";	// This will toggle the icons
		}
		else if (navmenus == "No")
		{
			style = "navNoStart";
			styleShadow = "navNoStartShadow";
		}
		navStart.className = style;
		navStartShadow.className = styleShadow;
		navStartVShadow.className = style;
		navStartSECorner.className = styleShadow;
	},
	/**
	 * Hide/show the menu bar.
	 */
	changeMenubar: function(menus)
	{
		var menubarTable = document.getElementById("menubar");
		
		if (menus == "No")
			menubarTable.style.display="none";
		else
			menubarTable.style.display="";
	},
	/**
	 * Parse this new dom for dojo controls.
	 */
	fixNewDOM: function(domToAppendTo)
	{
		parser.parse(domToAppendTo);
	},
	/**
	 * Get all the form data from this screen and stick it in a name/value object.
	 */
	getFormData: function(hiddenOnly) {
		var form = document.getElementById("submit1");
		var formValues = {};
		for (var i = 0; i < form.elements.length; i++) {
			var elem = form.elements[i];
			if ((elem.name == "button") || (elem.name == "") || (!elem.name))
				continue;
			if (hiddenOnly)
				if (elem.type != "hidden")
					continue;
			formValues[elem.name] = elem.value;
		}
		if (!hiddenOnly)
		{
			var elements = document.getElementsByTagName("div");
			i = 0;
			while (elem = elements[i++])
			{
			    if (elem.className)
			    	if (elem.className.indexOf("jbundle.Editor") != -1)
			    {
					var editor = registry.byNode(elem);
					if (editor)
						formValues[editor.name] = editor.getValue();
			    }
			}
		}
		return formValues;
	},
	/**
	 * Is the screen a data entry form?
	 */
	isForm: function() {
		if (document.getElementById("submit1"))
			return true;
		return false;
	},
	/**
	 * Get all the form data from this screen and stick it in a name/value object.
	 */
	setFormData: function(formValues) {
		var form = document.getElementById("submit1");
		if (!form)
			return;
		for (var i = 0; i < form.elements.length; i++) {
			var elem = form.elements[i];
			if ((elem.name == "button") || (elem.name == "") || (!elem.name) || (elem.type == "hidden"))
				continue;
			if ((formValues) && (formValues[elem.name]))
				elem.value = formValues[elem.name];
			else if ((this.defaultFormValues) && (this.defaultFormValues[elem.name]))
				elem.value = this.defaultFormValues[elem.name];
			else
				elem.value = "";
		}
		var elements = document.getElementsByTagName("div");
		i = 0;
		while (elem = elements[i++])
		{
		    if (elem.className)
		    	if (elem.className.indexOf("jbundle.Editor") != -1)
		    {
				var editor = registry.byNode(elem);
				if (editor)
				{
					if ((formValues) && (formValues[editor.name]))
						editor.setValue(formValues[editor.name]);
					else if ((this.defaultFormValues) && (this.defaultFormValues[editor.name]))
						editor.setValue(this.defaultFormValues[editor.name]);
					else
						editor.setValue("");
				}
		    }
		}
	},
	defaultFormValues: null,
	/**
	 * Clear all the data in this form and make sure the hidden objectID is cleared.
	 */
	clearFormData: function() {
		this.setFormData(null);
		if (document.getElementById('objectID'))
			document.getElementById('objectID').value = "";
	},
	/**
	 * Get all the form data from this screen and stick it in a name/value object.
	 */
	clearGridData: function(objectID) {
		var tr = document.getElementById(objectID);
		if (tr)
			thinutil.removeChildren(tr, true);
	},
	// Display the wait cursor
	waitCursor: function()
	{
		document.body.style.cursor = 'wait';
	},
	// Display the normal cursor
	restoreCursor: function(command)
	{
		document.body.style.cursor = 'default';
	},
	// Display a applet with this command in the content area.
	// Returns true if successful
	displayApplet: function(command)
	{
		if (!java)
			return false;	// No java.js
		this.appletDisplayed = java.displayApplet(command);
		return this.appletDisplayed;
	},
	appletDisplayed: false
    };
});
