<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">

<xsl:element name="div">
	<xsl:attribute name="id">logonDialog</xsl:attribute>
	<xsl:attribute name="dojoType">dijit.Dialog</xsl:attribute>
	<xsl:attribute name="bgColor">white</xsl:attribute>
	<xsl:attribute name="bgOpacity">0.5</xsl:attribute>
	<xsl:attribute name="toggle">fade</xsl:attribute>
	<xsl:attribute name="toggleDuration">250</xsl:attribute>
	<xsl:attribute name="title"><xsl:value-of select="root/dialogTitle"/></xsl:attribute>
	<xsl:attribute name="iconSrc">images/buttons/Login.gif</xsl:attribute>
	<xsl:attribute name="displayCloseAction">true</xsl:attribute>
	<form id="logonForm" onsubmit="return jbundle.gui.submitLogonDialog(true);">
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
						<xsl:attribute name="dojoType">dijit.form.TextBox</xsl:attribute>
						<xsl:attribute name="value">
							<xsl:value-of select="root/user"/>
						</xsl:attribute>
					</xsl:element>
				</td>
			</tr>
			<tr>
				<td>Password:</td>
				<td>
					<input id="loginPassword" type="password" name="password" dojoType="dijit.form.TextBox" />
				</td>
			</tr>
			<tr>
				<td colspan="2" align="center">
					<input id="loginSaveUser" type="checkbox" name="saveUser" dojoType="dijit.form.CheckBox" checked="true"/> <label for="loginSaveUser">Remember me?</label>
				</td>
			</tr>
			<tr>
				<td colspan="2" align="center">
				<table>
				<tr>
					<td><button id="logonSubmitButton" dojoType="dijit.form.Button" onclick="jbundle.gui.submitLogonDialog(true);"><img src="images/buttons/Submit.gif" width="16" height="16" />&#160;Submit</button></td>
					<td></td>
					<td><button id="logonCancelButton" dojoType="dijit.form.Button" onclick="jbundle.gui.submitLogonDialog(false);"><img src="images/buttons/Cancel.gif" width="16" height="16" />&#160;Cancel</button></td>
					<td></td>
					<td><button id="logonNewUser" dojoType="dijit.form.Button" onclick="jbundle.gui.submitLogonDialog('?screen=.main.user.screen.UserEntryScreen&amp;java=no');"><img src="images/buttons/Form.gif" width="16" height="16" alt="Create new account" class="button" />Create new account</button></td>
				</tr>
				</table>
				</td>
			</tr>
		</table>
	</form>
</xsl:element>

</xsl:template>
</xsl:stylesheet>