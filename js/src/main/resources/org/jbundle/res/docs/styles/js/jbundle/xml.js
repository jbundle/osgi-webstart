/**
 * Top level methods and vars.
 */
if(!dojo._hasResource["jbundle.xml"]){
dojo._hasResource["jbundle.xml"] = true;
dojo.provide("jbundle.xml");

dojo.require("dojox.data.dom");

/**
 * Public Utilities.
 */
jbundle.xml = {
	doXSLT: function(domToBeTransformed, xsltURI, domToAppendTo, handler)
	{
		new jbundle.xml.InsertTransformTo(domToBeTransformed, xsltURI, domToAppendTo, handler);
	},
	InsertTransformTo: function(domToBeTransformed, xslUrl, elementToInsert, handler) {
		  this.xslUrl = xslUrl;
//		  this.xmlUrl = domToBeTransformed;
		  this.handler = handler;
		  this.xmlLoaded = this.xslLoaded = false;
		  this.elementToInsert = elementToInsert;
//		  this.load(domToBeTransformed, 'xml');
		  this.xml = domToBeTransformed;
		  this.xmlLoaded = true;
		  this.load(xslUrl, 'xsl');
		}
};

	jbundle.xml.InsertTransformTo.prototype.load = function (url, propertyName) {
		var httpRequest = null;
		if (window.XMLHttpRequest) {
			httpRequest = new window.XMLHttpRequest;
		}
		else {
		    try {
		    	httpRequest = new ActiveXObject("MSXML2.XMLHTTP.3.0");
		    }
		    catch(ex) {
		        //?return null;
		    }
		}
	  if (httpRequest != null) {
	    var thisObject = this;
	    httpRequest.open('GET', url, true);
	    httpRequest.onreadystatechange = function () {
	      if (httpRequest.readyState == 4) {
	        thisObject[propertyName + 'Loaded'] = true;
	        thisObject[propertyName] = httpRequest.responseXML;
	        if (thisObject.xmlLoaded && thisObject.xslLoaded) {
	          thisObject.transformAndInsert();
	        }
	      }
	    };
	    httpRequest.send(null);
	  }
	};

	jbundle.xml.InsertTransformTo.prototype.transformAndInsert = function () {
	  if (typeof XSLTProcessor != 'undefined') {
	    var xsltProcessor = new XSLTProcessor();
	    xsltProcessor.importStylesheet(this.xsl);
	    var frag = xsltProcessor.transformToFragment(this.xml, this.elementToInsert.ownerDocument);
	    this.elementToInsert.appendChild(frag);
	  }
	  else if (typeof this.xml.transformNode != 'undefined') {	// IE
	    this.elementToInsert.insertAdjacentHTML('beforeEnd', this.xml.transformNode(this.xsl));
	  }
	    else {

	        try {
	            // 3
	            if (window.ActiveXObject) {
	                var xslt = new ActiveXObject("Msxml2.XSLTemplate");
	                var xslDoc = new ActiveXObject("Msxml2.FreeThreadedDOMDocument");
	                xslDoc.loadXML(this.xsl.xml);
	                xslt.stylesheet = xslDoc;
	                var xslProc = xslt.createProcessor();
	                xslProc.input = this.xml;
	                xslProc.transform();

	                this.elementToInsert.insertAdjacentHTML('beforeEnd', xslProc.output);
	            }
	        }
	        catch (e) {
	            // 4
//?	            alert("The type [XSLTProcessor] and the function [XmlDocument.transformNode] are not supported by this browser, can't transform XML document to HTML string!");
	        }

	    }
	if (this.handler)
               this.handler(this.elementToInsert);
	};
}
