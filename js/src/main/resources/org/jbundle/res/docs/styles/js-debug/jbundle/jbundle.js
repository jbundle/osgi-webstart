/**
 * This is the top-level module that includes all the jbundle modules.
 * Just include this module and call the init method.
 * This module is combined with all the others for deployment.
 */

define([
    "jbundle/main",
	"jbundle/util",
	"dojo/parser",
	"jbundle/java",
	"dijit/form/Button",
	"dijit/form/TextBox",
	"dijit/form/Textarea",
	"dijit/form/CheckBox",
	"dijit/form/ComboBox",
	"dojo/back",
	"dojo/domReady!"
], function(main, util, parser){
    return {
	init: function()
	{
		parser.parse();
		util.init();
	}
  };
});
