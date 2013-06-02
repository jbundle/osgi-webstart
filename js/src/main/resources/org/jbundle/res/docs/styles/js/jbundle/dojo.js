/**
 * This is an empty module that includes all the jbundle modules.
 */

define([ "jbundle/main",
	"jbundle/util",
	"jbundle/java",
], function(main, util){
    return {
	init: function()
	{
		util.init();
	}
    };
});
