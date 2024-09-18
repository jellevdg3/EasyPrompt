const openfilelist = require('./openFileList');
const addfiles = require('./addFiles');
const clearfiles = require('./clearFiles');
const copyprompt = require('./copyPrompt');
const togglefile = require('./toggleFile');
const pasteCode = require('./pasteCode'); // Add this line

/**
 * Registers all commands for the extension.
 */
function registerCommands(fileListProvider) {
	const commands = [];

	commands.push(openfilelist.registerCommand(fileListProvider));
	commands.push(addfiles.registerCommand(fileListProvider));
	commands.push(clearfiles.registerCommand(fileListProvider));
	commands.push(copyprompt.registerCommand(fileListProvider));
	commands.push(togglefile.registerCommand(fileListProvider));
	commands.push(pasteCode.registerCommand(fileListProvider)); // Add this line

	return commands;
}

module.exports = registerCommands;
