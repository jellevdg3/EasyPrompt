// src/commands/openFileList.js
const vscode = require('vscode');

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