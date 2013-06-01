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
	  xsl = xmlParser.parse(xsl); //dojox.data.dom.createDocument(data, "text/xml");
	  if (typeof XSLTProcessor != 'undefined') {
	    var xsltProcessor = new XSLTProcessor();
	    xsltProcessor.importStylesheet(xsl);
	    var frag = xsltProcessor.transformToFragment(ioArgs.domToBeTransformed, ioArgs.elementToInsert.ownerDocument);
	    ioArgs.elementToInsert.appendChild(frag);
	  }
	  else if (typeof ioArgs.domToBeTransformed.transformNode != 'undefined') {	// IE
		  ioArgs.elementToInsert.insertAdjacentHTML('beforeEnd', ioArgs.domToBeTransformed.transformNode(xsl));
	  }
	  else {
	        try {
	            if (window.ActiveXObject) {
	                var xslt = new ActiveXObject("Msxml2.XSLTemplate");
	                var xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
	                xslDoc.loadXML(xsl.xml);
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
	/**
	 * Utility - Remove all children from this node.
	 */
	removeChildren: function(dom, removeFromParent)
	{
		if (dom.nodeType == 1)	// Node.ELEMENT_NODE)
		{
			if (dom.getAttribute("widgetid"))
			{	// TODO (don) - Fix this to use dom.destroy();
				if (removeFromParent)
				{
		    		require(["dijit/registry"], function(registry) {
						if (registry.byId(dom.getAttribute("widgetid")))
						{
							registry.byId(dom.getAttribute("widgetid")).destroyRecursive();
							removeFromParent = false;	// Previous command removed it.
						}
	//					dijit.util.manager.remove(dom.getAttribute("widgetid"));	// dojo destroy
		    		});
				}
			}
			var children = dom.childNodes;
			for (var i = children.length-1; i >= 0; i--)
			{
				this.removeChildren(children[i], true);
			}
		}
		if (removeFromParent)
			dom.parentNode.removeChild(dom);
	},
    };
});

