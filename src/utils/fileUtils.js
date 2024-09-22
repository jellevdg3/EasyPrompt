const vscode = require('vscode');
const path = require('path');
const { extractPathsAndCodeFromContent, normalizePath, removeFilePathLine } = require('./messageUtils');

async function validateInput(rawContent, webviewView) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
		return false;
	}

	const extractedFiles = extractPathsAndCodeFromContent(rawContent.trim());

	if (!extractedFiles || extractedFiles.length === 0) {
		webviewView.webview.postMessage({
			command: 'showError',
			field: 'filePath',
			message: 'No valid file paths found in the content.'
		});
		return false;
	}

	for (const file of extractedFiles) {
		if (!file.filePath) {
			webviewView.webview.postMessage({
				command: 'showError',
				field: 'filePath',
				message: 'One or more file paths are empty.'
			});
			return false;
		}
		if (!file.code) {
			vscode.window.showErrorMessage('One or more code contents are empty.');
			return false;
		}
	}

	return true;
}

function prepareFiles(rawContent) {
	const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
	const extractedFiles = extractPathsAndCodeFromContent(rawContent.trim());
	const preparedFiles = extractedFiles.map(file => {
		let filePath = normalizePath(file.filePath);
		const absolutePath = path.isAbsolute(filePath)
			? filePath
			: path.join(workspaceUri.fsPath, filePath);
		return {
			absolutePath,
			codeContent: file.code
		};
	});
	return preparedFiles;
}

async function writeFileContent(fileUri, content) {
	const encoder = new TextEncoder();
	const contentBytes = encoder.encode(removeFilePathLine(content));

	try {
		await vscode.workspace.fs.stat(fileUri);
	} catch {
		// File does not exist, proceed to create
	}

	const parentUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
	await vscode.workspace.fs.createDirectory(parentUri);
	await vscode.workspace.fs.writeFile(fileUri, contentBytes);
}

async function formatAndSaveFile(fileUri) {
	const document = await vscode.workspace.openTextDocument(fileUri);
	await vscode.window.showTextDocument(document);
	await new Promise(resolve => setTimeout(resolve, 100));
	await vscode.commands.executeCommand('editor.action.formatDocument');
	await document.save();
}

module.exports = {
	validateInput,
	prepareFiles,
	writeFileContent,
	formatAndSaveFile,
	removeFilePathLine
};