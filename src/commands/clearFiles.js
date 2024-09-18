// src/commands/clearFiles.js
const vscode = require('vscode');

/**
 * Handles the "Clear Files" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.clearFiles', () => {
		fileListProvider.clearFiles();
	});
}

module.exports = {
	registerCommand
};
