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
		vscode.window.showWarningMessage('Are you sure you want to clear all files?', 'Yes', 'No')
			.then(selection => {
				if (selection === 'Yes') {
					fileListProvider.clearFiles();
				}
			});
	});
}

module.exports = {
	registerCommand
};
