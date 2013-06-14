<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">

<xsl:element name="div">
	<xsl:attribute name="id">logonDialog</xsl:attribute>
	<xsl:attribute name="data-dojo-type">dijit/Dialog</xsl:attribute>
	<xsl:attribute name="bgColor">white</xsl:attribute>
	<xsl:attribute name="bgOpacity">0.5</xsl:attribute>
	<xsl:attribute name="toggle">fade</xsl:attribute>
	<xsl:attribute name="toggleDuration">250</xsl:attribute>
	<xsl:attribute name="title"><xsl:value-of select="root/dialogTitle"/></xsl:attribute>
	<xsl:attribute name="iconSrc">images/buttons/Login.gif</xsl:attribute>
	<xsl:attribute name="displayCloseAction">true</xsl:attribute>
<xsl:element name="form">
	<xsl:attribute name="id">logonForm</xsl:attribute>
	<xsl:attribute name="onsubmit">
	require(['jbundle/util'], function(util) {
		return util.submitLogonDialog(true);
	});
	return false;	// Don't submit form.
	</xsl:attribute>
		<table>
			<xsl:element name="input">
				<xsl:attribute name="id">command</xsl:attribute>
				<xsl:attribute name="type">hidden</xsl:attribute>
				<xsl:attribute name="name">command</xsl:attribute>
				<xsl:attribute name="value">
					<xsl:value-of select="root/command"/>
				</xsl:attribute>
			</xsl:element>
			<tr>
				<td>E-mail:</td>
				<td>
					<xsl:element name="input">
						<xsl:attribute name="id">loginUser</xsl:attribute>
						<xsl:attribute name="type">text</xsl:attribute>
						<xsl:attribute name="name">user</xsl:attribute>
						<xsl:attribute name="data-dojo-type">dijit/form/TextBox</xsl:attribute>
						<xsl:attribute name="value">
							<xsl:value-of select="root/user"/>
						</xsl:attribute>
					</xsl:element>
				</td>
			</tr>
			<tr>
				<td>Password:</td>
				<td>
					<input id="loginPassword" type="password" name="password" data-dojo-type="dijit/form/TextBox" />
				</td>
			</tr>
			<tr>
				<td colspan="2" align="center">
					<input id="loginSaveUser" type="checkbox" name="saveUser" data-dojo-type="dijit/form/CheckBox" checked="true"/> <label for="loginSaveUser">Remember me?</label>
				</td>
			</tr>
			<tr>
				<td colspan="2" align="center">
				<table>
				<tr>
					<td>
<xsl:element name="button">
	<xsl:attribute name="id">logonSubmitButton</xsl:attribute>
	<xsl:attribute name="type">submit</xsl:attribute>
	<xsl:attribute name="data-dojo-type">dijit/form/Button</xsl:attribute>
	<!-- xsl:attribute name="onclick">
	require(['jbundle/util'], function(util) {
		util.submitLogonDialog(true);
	});
	</xsl:attribute -->
	<img src="images/buttons/Submit.gif" width="16" height="16" />
	&#160;Submit
</xsl:element>
					</td>
					<td></td>
					<td>
<xsl:element name="button">
	<xsl:attribute name="id">logonCancelButton</xsl:attribute>
	<xsl:attribute name="data-dojo-type">dijit/form/Button</xsl:attribute>
	<xsl:attribute name="onclick">
	require(['jbundle/util'], function(util) {
		util.submitLogonDialog(false);
	});
	</xsl:attribute>
	<img src="images/buttons/Cancel.gif" width="16" height="16" />
	&#160;Cancel
</xsl:element>
					</td>
					<td></td>
					<td>
<xsl:element name="button">
	<xsl:attribute name="id">logonNewUser</xsl:attribute>
	<xsl:attribute name="data-dojo-type">dijit/form/Button</xsl:attribute>
	<xsl:attribute name="onclick">
	require(['jbundle/util'], function(util) {
		util.submitLogonDialog('?screen=.main.user.screen.UserEntryScreen&amp;java=no');
	});
	</xsl:attribute>
	<xsl:attribute name="alt">Create new account</xsl:attribute>
	<img src="images/buttons/Form.gif" width="16" height="16" />
	&#160;Create new account
</xsl:element>
					</td>
				</tr>
				</table>
				</td>
			</tr>
		</table>
	</xsl:element>
</xsl:element>

</xsl:template>
</xsl:stylesheet>