const openfilelist = require('./openFileList');
const addfiles = require('./addFiles');
const clearfiles = require('./clearFiles');
const copyprompt = require('./copyPrompt');
const removefile = require('./removeFile');
const togglefile = require('./toggleFile');

/**
 * Registers all commands for the extension.
 */
function registerCommands(fileListProvider) {
	const commands = [];

	commands.push(openfilelist.registerCommand(fileListProvider));
	commands.push(addfiles.registerCommand(fileListProvider));
	commands.push(clearfiles.registerCommand(fileListProvider));
	commands.push(copyprompt.registerCommand(fileListProvider));
	commands.push(removefile.registerCommand(fileListProvider));
	commands.push(togglefile.registerCommand(fileListProvider));

	return commands;
}

module.exports = registerCommands;