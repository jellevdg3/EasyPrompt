// src/commands/addFiles.js
const vscode = require('vscode');

/**
 * Handles the "Add Files" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.addFiles', async () => {
		const selectedFiles = await vscode.window.showOpenDialog({
			canSelectMany: true,
			openLabel: 'Select Files',
			filters: {
				'All Files': ['*']
			}
		});
		if (selectedFiles) {
			const filePaths = selectedFiles.map(file => file.fsPath);
			await fileListProvider.addFiles(filePaths);
		}
	});
}

module.exports = {
	registerCommand
};
