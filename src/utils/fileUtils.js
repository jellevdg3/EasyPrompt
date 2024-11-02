const vscode = require('vscode');
const path = require('path');
const { extractPathsAndCodeFromContent, normalizePath, removeFilePathLine } = require('./messageUtils');

async function validateInput(rawContent, webviewView, fallbackFilePath) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
		return false;
	}

	if (fallbackFilePath && fallbackFilePath !== '[Multiple Files Detected]') {
		if (!fallbackFilePath.trim()) {
			webviewView.webview.postMessage({
				command: 'showError',
				field: 'filePath',
				message: 'File path cannot be empty.'
			});
			return false;
		}
		if (!rawContent.trim()) {
			webviewView.webview.postMessage({
				command: 'showError',
				field: 'codeContent',
				message: 'Code content is empty.'
			});
			return false;
		}
		return true;
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

function prepareFiles(rawContent, fallbackFilePath) {
	const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
	if (fallbackFilePath && fallbackFilePath !== '[Multiple Files Detected]') {
		let filePath = normalizePath(fallbackFilePath);
		const absolutePath = path.isAbsolute(filePath)
			? filePath
			: path.join(workspaceUri.fsPath, filePath);
		return [{
			absolutePath,
			codeContent: rawContent
		}];
	}

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

	const retries = 5;
	for (var i = 0; i < retries; i++) {
		try {
			try {
				await vscode.workspace.fs.stat(fileUri);
			} catch {
			}

			const parentUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
			await vscode.workspace.fs.createDirectory(parentUri);
			await vscode.workspace.fs.writeFile(fileUri, contentBytes);
		} catch (error) {
			await new Promise(resolve => setTimeout(resolve, 100));
			if (i >= retries - 1) {
				throw new Error(error);
			}
		}
	}
}

async function formatAndSaveFile(fileUri) {
	const retries = 5;
	for (var i = 0; i < retries; i++) {
		try {
			const autoClose = false;
			const document = await vscode.workspace.openTextDocument(fileUri);
			const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri.toString() === fileUri.toString());
			const wasOpen = editors.length > 0;
			await vscode.window.showTextDocument(document);
			await new Promise(resolve => setTimeout(resolve, 100));
			await vscode.commands.executeCommand('editor.action.formatDocument');
			await document.save();
			if (autoClose && !wasOpen) {
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			}
			return;
		}
		catch (error) {
			await new Promise(resolve => setTimeout(resolve, 100));
			if (i >= retries - 1) {
				throw new Error(error);
			}
		}
	}
}

module.exports = {
	validateInput,
	prepareFiles,
	writeFileContent,
	formatAndSaveFile,
	removeFilePathLine
};