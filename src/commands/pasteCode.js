const vscode = require('vscode');
const path = require('path');
const { extractFilePathFromContent, normalizePath } = require('../utils/pathUtils');

/**
 * Handles the "Paste Code" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.pasteCode', async () => {


		// Read the content from the clipboard
		const clipboardContent = await vscode.env.clipboard.readText();

		if (!clipboardContent) {
			vscode.window.showErrorMessage('Clipboard is empty.');
			return;
		}

		// Extract the file path from the first line
		const filePathRaw = extractFilePathFromContent(clipboardContent);

		if (!filePathRaw) {
			vscode.window.showErrorMessage('Could not extract file path from pasted content.');
			return;
		}

		let filePath = normalizePath(filePathRaw);

		// If the filePath does not contain a path separator, search in the file list
		if (!filePath.includes('/')) {
			const matchingFile = fileListProvider.files.find(f => {
				return path.basename(f.path).toLowerCase() === filePath.toLowerCase();
			});
			if (matchingFile) {
				filePath = matchingFile.path;
			}
			// If not found, proceed with the file name as is (will create in root)
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
			return;
		}

		const workspaceUri = workspaceFolders[0].uri;
		const fileUri = vscode.Uri.joinPath(workspaceUri, filePath);

		// Remove the first line(s) containing the file path
		const contentWithoutPath = clipboardContent.replace(/^.*\n/, ''); // Remove the first line

		const encoder = new TextEncoder();
		const contentBytes = encoder.encode(contentWithoutPath);

		try {
			// Check if file exists
			let fileExists = false;
			try {
				await vscode.workspace.fs.stat(fileUri);
				fileExists = true;
			} catch (error) {
				// File does not exist
			}

			// Create parent directories if necessary
			const parentUri = vscode.Uri.joinPath(workspaceUri, path.dirname(filePath));
			await vscode.workspace.fs.createDirectory(parentUri);

			// Write the content to the file
			await vscode.workspace.fs.writeFile(fileUri, contentBytes);

			if (!fileExists) {
				// Add the new file to the file list
				await fileListProvider.addFiles([fileUri.fsPath]);
			}

			vscode.window.showInformationMessage('Code pasted successfully!');
		} catch (error) {
			console.error(`Error writing file ${filePath}: ${error}`);
			vscode.window.showErrorMessage(`Failed to write file: ${filePath}`);
		}
	});
}

module.exports = {
	registerCommand
};
