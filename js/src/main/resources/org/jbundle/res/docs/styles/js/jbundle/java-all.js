/**
 * This is an empty module that includes all the jbundle modules.
 */

define([
	"dojo/parser",
	"jbundle/java",
	"dojo/back",
	"dojo/domReady!"
], function(parser, main){
    return {
	init: function()
	{
		parser.parse();
	}
  };
});
