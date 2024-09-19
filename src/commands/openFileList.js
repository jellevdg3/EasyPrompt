const vscode = require('vscode');

/**
 * @filePath src/commands/openFileList.js
 * Handles the "Open Code Prompt Generator Window" command.
 */

/**
 * Handles the "Open Code Prompt Generator Window" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.openFileList', () => {
		vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator'); // Updated container ID
	});
}

module.exports = {
	registerCommand
};