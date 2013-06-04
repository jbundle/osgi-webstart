/**
 * Shared utilities.
 */
define([
], function(){
    return {
	// Convert this properties object to a command
	propertiesToCommand: function(properties)
	{
		var command = "?";
		if (properties)
		{
			if (typeof(properties) == 'string')
				if (properties.length > 1)
				{
					if (!properties.substring(0, 1) != "(")
						properties = "(" + properties + ")";
					properties = eval(properties);
				}
			for (var name in properties)
			{
				if (command.length > 1)
					command += "&";
				command += name + "=" + escape(properties[name]);
			}
		}
		return command;
	},
	// Convert this command string to a properties object.
	commandToProperties: function(command, properties)
	{
		if (!properties)
			properties = {};
		var commandArray = command.split(/[;&?]/);
		for (var i = 0; i < commandArray.length; i++)
		{
			var thisCommand = commandArray[i];
			while ((thisCommand.charAt(0) == ' ') || (thisCommand.charAt(0) == '?'))
				thisCommand = thisCommand.substring(1, thisCommand.length);
			var equals = thisCommand.indexOf('=');
			if (equals != -1)	// Always
				properties[thisCommand.substring(0, equals)] = unescape(thisCommand.substring(equals+1, thisCommand.length));
		}
		return properties;
	},
	// Get this property from this command string
	getProperty: function(command, key)
	{
		var nameEQ = key.toUpperCase() + "=";
		if (command == null)
			return null;
		if (command.indexOf("?") != -1)
			if ((command.indexOf("?") < command.indexOf("&") || (command.indexOf("&") == -1)))
				command = command.substring(command.indexOf("?") + 1);
		var ca = command.split(/[;&]/);
		for (var i = 0; i < ca.length; i++)
		{
			var c = ca[i];
			while ((c.charAt(0) == ' ') || (c.charAt(0) == '?'))
				c = c.substring(1, c.length);
			if (c.toUpperCase().indexOf(nameEQ) == 0)
				return unescape(c.substring(nameEQ.length, c.length));
		}
		return null;
	},
	// Remove the hash mark
	getCommandFromHash: function(hash)
	{
		if (hash)
			if (hash.length > 0)
		{
			hash = unescape(hash);
			if (hash.substring(0, 1) == '#')
				hash = hash.substring(1);
		}
		return hash;
	},
    };
});
