/**
 * Public Utilities.
 */

define([
    	"dojo/request",
    	"dojox/xml/parser",
    	"dojo/domReady!"
], function(request, xmlParser){
    return {
	doXSLT: function(domToBeTransformed, xslUrl, elementToInsert, handler)
	{
		ioArgs = {};
		ioArgs.xslUrl = xslUrl;
		ioArgs.handler = handler;
		ioArgs.elementToInsert = elementToInsert;
		ioArgs.domToBeTransformed = domToBeTransformed;
		bindArgs = {};
		bindArgs.ioArgs = ioArgs;
		//xbindArgs.handleAs = "xml";	// For now, convert to xml manually (dojo 1.9 bug)

	    request.get(xslUrl, bindArgs).response.then(
            function(response) {
    	        require(["jbundle/xml"], function(xml) {
    	          xml.transformAndInsert(response.data, response.options.ioArgs);
    	        });
            },
            function(response) {
            	return;	 // NO NO NO - this.transportError(response);
            });
	},
	transformAndInsert: function (xsl, ioArgs) {
	  if (typeof XSLTProcessor != 'undefined') {
		  xsl = this.parse(xsl);
		  var xsltProcessor = new XSLTProcessor();
		  xsltProcessor.importStylesheet(xsl);
		  var frag = xsltProcessor.transformToFragment(ioArgs.domToBeTransformed, ioArgs.elementToInsert.ownerDocument);
		  ioArgs.elementToInsert.appendChild(frag);
	  }
	  else if (typeof ioArgs.domToBeTransformed.transformNode != 'undefined') {	// IE
		  xsl = this.parse(xsl);
		  ioArgs.elementToInsert.insertAdjacentHTML('beforeEnd', ioArgs.domToBeTransformed.transformNode(xsl));
	  }
	  else {
	        try {
	            if (window.ActiveXObject) {
	                var xslt = new ActiveXObject("Msxml2.XSLTemplate");
	                var xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
	                xslDoc.loadXML(xsl);
	                xslt.stylesheet = xslDoc;
	                var xslProc = xslt.createProcessor();
	                xslProc.input = ioArgs.domToBeTransformed;
	                xslProc.transform();

	                ioArgs.elementToInsert.insertAdjacentHTML('beforeEnd', xslProc.output);
	            }
	        }
	        catch (e) {
	            // 4
//?	            alert("The type [XSLTProcessor] and the function [XmlDocument.transformNode] are not supported by this browser, can't transform XML document to HTML string!");
	        }

	    }
	if (ioArgs.handler)
               ioArgs.handler(ioArgs.elementToInsert);
	},
	parse: function(data, mimeType)
	{
		if (window.ActiveXObject)
			if (typeof dojo.global.DOMParser != 'undefined')
		{	// HACK - Don't know why this object is present in IE
			deletedparser = dojo.global.DOMParser;
			delete dojo.global.DOMParser;
		}
		var dom = xmlParser.parse(data, mimeType); //dojox.data.dom.createDocument(data, "text/xml");
		if (typeof deletedparser != 'undefined')
			dojo.global.DOMParser = deletedparser;
		return dom;
	}
  };
});

