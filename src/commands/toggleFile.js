// src/commands/toggleFile.js
const vscode = require('vscode');

/**
 * Handles the "Toggle Enable/Disable" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.toggleFile', (element) => {
		fileListProvider.toggleFile(element);
	});
}

module.exports = {
	registerCommand
};
