const vscode = require('vscode');

/**
 * @filePath src/commands/removeFile.js
 * Handles the "Remove File" command.
 */

/**
 * Handles the "Remove File" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.removeFile', (element) => {
		if (element && element.file) {
			fileListProvider.removeFile(element.file.path);
			vscode.window.showInformationMessage(`Removed file: \${element.file.path}`);
		} else {
			vscode.window.showErrorMessage('Unable to remove file: Invalid element.');
		}
	});
}

module.exports = {
	registerCommand
};