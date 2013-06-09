/**
 * This is the top-level module that includes the java-plugin jbundle modules.
 * Just include this module and call the init method.
 * This module is combined with all the others for deployment.
 * This is different from the jbundle module in that it does not include
 * the (very large) dojo dijit and parser libraries.
 */

define([
	"jbundle/java",
	"jbundle/back",
	"dojo/domReady!"
	], function(main, back){
    return {
	init: function()
	{
		main.init();
	},
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    runAppletWithCommand: function(command, hash, version) {
    		main.runAppletWithCommand(command, hash, version);
    },
    /**
     * Same as deployJava, except I add to a string instead of doing document.write(xx).
     * NOTE: This method only works with the gui code.
     */
    getAppletWithCommand: function(command, hash, version) {
    	return main.getAppletWithCommand(command, hash, version);
    },
    /**
     * Similar to deployJava, except I pass the complete command.
     */
    writeAppletTag: function(attributes, parameters) {
    	return main.writeAppletTag(attributes, parameters);
    }
  };
});
