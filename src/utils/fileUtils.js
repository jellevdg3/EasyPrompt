const vscode = require('vscode');
const path = require('path');
const { extractFilePathFromContent, normalizePath } = require('./pathUtils');

/**
 * @filePath src/utils/fileUtils.js
 * Utility functions for file operations.
 */

/**
 * Validates the input file path and code content.
 * @param {string} filePathRaw 
 * @param {string} codeContentRaw 
 * @param {vscode.WebviewView} webviewView 
 * @param {vscode.ExtensionContext} context
 * @returns {Promise<boolean>}
 */
async function validateInput(filePathRaw, codeContentRaw, webviewView, context) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
		return false;
	}

	const filePath = filePathRaw.trim();
	const codeContent = codeContentRaw.trim();

	if (!filePath) {
		// Inform the webview to show error
		webviewView.webview.postMessage({
			command: 'showError',
			field: 'filePath',
			message: 'File path cannot be empty.'
		});
		return false;
	}

	if (!codeContent) {
		vscode.window.showErrorMessage('Code content cannot be empty.');
		return false;
	}

	return true;
}

/**
 * Prepares the file path and code content for writing.
 * @param {string} filePathRaw 
 * @param {string} codeContentRaw 
 * @param {vscode.ExtensionContext} context
 * @returns {Object} Contains absolutePath and codeContent
 */
function prepareFile(filePathRaw, codeContentRaw, context) {
	const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
	let filePath = filePathRaw.trim();
	let codeContent = codeContentRaw.trim();

	const extractedFilePath = extractFilePathFromContent(codeContent);
	if (extractedFilePath) {
		// Remove the file path line from the code content
		codeContent = removeFilePathLine(codeContent);
		// Optionally, you can choose to prefer the input filePath over the extracted one
		// For now, we'll use the input filePath
	}

	// Normalize the file path
	filePath = normalizePath(filePath);

	// Resolve the absolute file path
	const absolutePath = path.isAbsolute(filePath)
		? filePath
		: path.join(workspaceUri.fsPath, filePath);

	return { absolutePath, codeContent };
}

/**
 * Removes the first line that contains the file path from the code content.
 * @param {string} content 
 * @returns {string}
 */
function removeFilePathLine(content) {
	const { FILE_PATH_REGEXES } = require('./pathUtils');
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line === '') {
			continue;
		}

		for (const regex of FILE_PATH_REGEXES) {
			const match = line.match(regex);
			if (match) {
				// Remove this line
				lines.splice(i, 1);
				return lines.join('\n').trim();
			}
		}

		// If no match in the first non-empty line, break
		break;
	}

	// If no file path line found, return the original content
	return content;
}

/**
 * Writes the content to the specified file URI.
 * @param {vscode.Uri} fileUri 
 * @param {string} content 
 */
async function writeFileContent(fileUri, content) {
	const encoder = new TextEncoder();
	const contentBytes = encoder.encode(content);

	// Check if file exists
	let fileExists = false;
	try {
		await vscode.workspace.fs.stat(fileUri);
		fileExists = true;
	} catch (error) {
		// File does not exist
	}

	// Create parent directories if necessary
	const parentUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
	await vscode.workspace.fs.createDirectory(parentUri);

	// Write the content to the file
	await vscode.workspace.fs.writeFile(fileUri, contentBytes);
}

/**
 * Formats and saves the written file.
 * @param {vscode.Uri} fileUri 
 */
async function formatAndSaveFile(fileUri) {
	const document = await vscode.workspace.openTextDocument(fileUri);
	const editor = await vscode.window.showTextDocument(document);

	// Wait for the editor to be ready
	await new Promise(resolve => setTimeout(resolve, 100));

	// Execute the format command on the active editor
	await vscode.commands.executeCommand('editor.action.formatDocument');

	// Save the formatted document
	await document.save();
}

module.exports = {
	validateInput,
	prepareFile,
	writeFileContent,
	formatAndSaveFile,
	removeFilePathLine // Exported for reuse
};