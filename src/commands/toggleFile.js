const vscode = require('vscode');

/**
 * @filePath src/commands/toggleFile.js
 * Handles the "Toggle Enable/Disable" command.
 */

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