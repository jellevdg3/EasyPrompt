const vscode = require('vscode');
const path = require('path');
const { extractFilePathFromContent, normalizePath } = require('./pathUtils');

async function validateInput(filePathRaw, codeContentRaw, webviewView, context) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
		return false;
	}

	const filePath = filePathRaw.trim();
	const codeContent = codeContentRaw.trim();

	if (!filePath) {
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

function prepareFile(filePathRaw, codeContentRaw, context) {
	const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
	let filePath = filePathRaw.trim();
	let codeContent = codeContentRaw.trim();

	const extractedFilePath = extractFilePathFromContent(codeContent);
	if (extractedFilePath) {
		codeContent = removeFilePathLine(codeContent);
	}

	filePath = normalizePath(filePath);
	const absolutePath = path.isAbsolute(filePath)
		? filePath
		: path.join(workspaceUri.fsPath, filePath);

	return { absolutePath, codeContent };
}

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
				lines.splice(i, 1);
				return lines.join('\n').trim();
			}
		}

		break;
	}

	return content;
}

async function writeFileContent(fileUri, content) {
	const encoder = new TextEncoder();
	const contentBytes = encoder.encode(content);

	let fileExists = false;
	try {
		await vscode.workspace.fs.stat(fileUri);
		fileExists = true;
	} catch (error) {
	}

	const parentUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
	await vscode.workspace.fs.createDirectory(parentUri);
	await vscode.workspace.fs.writeFile(fileUri, contentBytes);
}

async function formatAndSaveFile(fileUri) {
	const document = await vscode.workspace.openTextDocument(fileUri);
	const editor = await vscode.window.showTextDocument(document);
	await new Promise(resolve => setTimeout(resolve, 100));
	await vscode.commands.executeCommand('editor.action.formatDocument');
	await document.save();
}

module.exports = {
	validateInput,
	prepareFile,
	writeFileContent,
	formatAndSaveFile,
	removeFilePathLine
};