var profile = (function(){
    return {
        basePath: "..",
        releaseDir: ".",
        releaseName: "../js",
        action: "release",
	// Strips all comments and whitespace from CSS files and inlines @imports where possible.
	cssOptimize: 'comments',

	// Excludes tests, demos, and original template files from being included in the built version.
//	mini: true,

	// Uses Closure Compiler as the JavaScript minifier. This can also be set to "shrinksafe" to use ShrinkSafe,
	// though ShrinkSafe is deprecated and not recommended.
	// This option defaults to "" (no compression) if not provided.
//	optimize: 'closure',

	// We're building layers, so we need to set the minifier to use for those, too.
	// This defaults to "shrinksafe" if not provided.
//	layerOptimize: 'closure',

	// Strips all calls to console functions within the code. You can also set this to "warn" to strip everything
	// but console.error, and any other truthy value to strip everything but console.warn and console.error.
	// This defaults to "normal" (strip all but warn and error) if not provided.
	stripConsole: 'all',

	// The default selector engine is not included by default in a dojo.js build in order to make mobile builds
	// smaller. We add it back here to avoid that extra HTTP request. There is also a "lite" selector available; if
	// you use that, you will need to set the `selectorEngine` property in `app/run.js`, too. (The "lite" engine is
	// only suitable if you are not supporting IE7 and earlier.)
//	selectorEngine: 'acme',

        packages:[{
            name: "dojo",
            location: "dojo"
        },{
            name: "dijit",
            location: "dijit"
        },{
            name: "dojox",
            location: "dojox"
        },{
            name: "jbundle",
            location: "jbundle"
        }],
 
	// Builds can be split into multiple different JavaScript files called "layers". This allows applications to
	// defer loading large sections of code until they are actually required while still allowing multiple modules to
	// be compiled into a single file.
	layers: {
	'jbundle/jbundle': {},
	
	'jbundle/webstart': {},
    },
    
        resourceTags: {
		// Files that contain test code and should be excluded when the `copyTests` build flag exists and is `false`.
		// It is strongly recommended that the `mini` build flag be used instead of `copyTests`. Therefore, no files
		// are marked with the `test` tag here.
		test: function (filename, mid) {
			return false;
		},

		// Files that should be copied as-is without being modified by the build system.
		// All files in the `app/resources` directory that are not CSS files are marked as copy-only, since these files
		// are typically binaries (images, etc.) and may be corrupted by the build system if it attempts to process
		// them and naively assumes they are scripts.
		copyOnly: function (filename, mid) {
			return (/^app\/resources\//.test(filename) && !/\.css$/.test(filename));
		},

		// Files that are AMD modules.
		// All JavaScript in this package should be AMD modules if you are starting a new project. If you are copying
		// any legacy scripts from an existing project, those legacy scripts should not be given the `amd` tag.
		amd: function (filename, mid) {
			return !this.copyOnly(filename, mid) && /\.js$/.test(filename);
		},

		// Files that should not be copied when the `mini` build flag is set to true.
		// In this case, we are excluding this package configuration file which is not necessary in a built copy of
		// the application.
		miniExclude: function (filename, mid) {
			return mid in {
				'app/package': 1
			};
		}
        },

	// Providing hints to the build system allows code to be conditionally removed on a more granular level than
	// simple module dependencies can allow. This is especially useful for creating tiny mobile builds.
	// Keep in mind that dead code removal only happens in minifiers that support it! Currently, only Closure Compiler
	// to the Dojo build system with dead code removal.
	// A documented list of has-flags in use within the toolkit can be found at
	// <http://dojotoolkit.org/reference-guide/dojo/has.html>.
	staticHasFeatures: {
		// The trace & log APIs are used for debugging the loader, so we do not need them in the build.
		'dojo-trace-api': 0,
		'dojo-log-api': 0,

		// This causes normally private loader data to be exposed for debugging. In a release build, we do not need
		// that either.
		'dojo-publish-privates': 0,

		// This application is pure AMD, so get rid of the legacy loader.
		'dojo-sync-loader': 0,

		// `dojo-xhr-factory` relies on `dojo-sync-loader`, which we have removed.
		'dojo-xhr-factory': 0,

		// We are not loading tests in production, so we can get rid of some test sniffing code.
		'dojo-test-sniff': 0
	},

    };
})();

