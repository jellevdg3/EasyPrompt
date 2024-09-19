const vscode = require('vscode');

/**
 * @filePath src/commands/clearFiles.js
 * Handles the "Clear Files" command.
 */

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