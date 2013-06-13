/**
 * This is the top-level module that includes all the jbundle modules.
 * Just include this module and call the init method.
 * This module is combined with all the others for deployment.
 */

define([
    "jbundle/main",
	"jbundle/util",
	"jbundle/back",
	"jbundle/java",
	"dojo/parser",
	"dijit/form/Button",
	"dijit/form/TextBox",
	"dijit/form/Textarea",
	"dijit/form/CheckBox",
	"dijit/form/ComboBox",
	"dojo/domReady!"
], function(main, util, back, java, parser) {
    return {
	init: function()
	{
		// parser.parse();	// parseonload should be set to yes
		back.init();
		java.init();
		util.init();
	}
  };
});
