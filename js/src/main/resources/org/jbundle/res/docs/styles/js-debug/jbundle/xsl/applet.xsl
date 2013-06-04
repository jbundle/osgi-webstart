<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">

<div id='content-area'>
<script src="http://java.com/js/deployJava.js"></script>
<script>
<![CDATA[deployJava.runApplet({code:"org.jbundle.Main",
codebase:"http://192.168.1.60:8080/app",
width:"100%", Height:"95%"}, {
backgroundcolor:"#eeeeff",
background:"backgrounds/worldmapalpha.gif",
url:"http://192.168.1.60:8080/app",
baseURL:"192.168.1.60:8080/tour/",
menu:"dev.jbundle.com",
domain:"192.168.1.60",
userid:"11",
jnlpjars:"lib/thickscreen",
jnlpextensions:"docs/jnlp/thin,docs/jnlp/thintest,docs/jnlp/thick,docs/jnlp/resource,docs/jnlp/thintour,docs/jnlp/tour,docs/jnlp/thicktest",
jnlp_href:"http://192.168.1.60:8080/app?datatype=jnlpapplet&applet=org.jbundle.Main&backgroundcolor=%23eeeeff&background=backgrounds%2Fworldmapalpha.gif&url=http%3A%2F%2F192.168.1.60%3A8080%2Ftour%2Fapp&baseURL=192.168.1.60%3A8080%2Ftour%2F&menu=dev.jbundle.com&domain=192.168.1.60&userid=11&jnlpjars=lib%2Fthickscreen&jnlpextensions=docs%2Fjnlp%2Fthin%2Cdocs%2Fjnlp%2Fthintest%2Cdocs%2Fjnlp%2Fthick%2Cdocs%2Fjnlp%2Fresource%2Cdocs%2Fjnlp%2Fthintour%2Cdocs%2Fjnlp%2Ftour%2Cdocs%2Fjnlp%2Fthicktest"},
"1.6");]]>
</script>
</div>

</xsl:template>
</xsl:stylesheet>