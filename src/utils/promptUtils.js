const vscode = require('vscode');
const path = require('path');
const codePrepUtils = require('./codePrepUtils');

async function generatePrompt(activeFiles, appendLine) {
	let prompt = '';
	for (const file of activeFiles) {
		try {
			const fileContent = await readFileContent(file.fullPath);
			const processedContent = processFileContent(fileContent, file.path);
			prompt += processedContent;
		} catch (error) {
			console.error(`Error reading file ${file.path}: ${error}`);
			vscode.window.showErrorMessage(`Failed to read file: ${file.path}`);
		}
	}

	if (appendLine && appendLine.trim() !== '') {
		prompt += appendLine.trim() + '\n\n\n';
	}

	return prompt;
}

function extractFilesAndCode(message) {
	const result = [];
	const regex = /###\s+(.+?)\s+```([\w+#\-]+)\s*([\s\S]*?)```/g
	let match;
	while ((match = regex.exec(message)) !== null) {
		const filePath = match[1].trim();
		const language = match[2].trim();
		const code = match[3].trim();

		if (filePath && language && code) {
			result.push({ filePath, language, code });
		} else {
			console.warn('Incomplete section found:', match[0]);
		}
	}

	return result;
}

async function prepareCode(rawContent, context) {
	const { files, preparedData } = await codePrepUtils.prep(rawContent, context);
	if (files.length > 0) {
		// Handle extracted files
		// Example: Write each file
		for (const file of files) {
			const fileUri = vscode.Uri.file(file.filePath);
			await vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf8'));
			await formatAndSaveFile(fileUri);
		}
		return { success: true, message: 'Files extracted and written successfully.' };
	} else if (preparedData) {
		// Handle default preparation
		const { absolutePath, codeContent } = preparedData;
		const fileUri = vscode.Uri.file(absolutePath);
		try {
			await writeFileContent(fileUri, codeContent);
			await formatAndSaveFile(fileUri);
			return { success: true, message: 'File written successfully.' };
		} catch (error) {
			console.error(`Error writing file ${absolutePath}: ${error}`);
			vscode.window.showErrorMessage(`Failed to write file: ${absolutePath}`);
			return { success: false, message: 'Failed to write file.' };
		}
	}
}

async function readFileContent(fullPath) {
	const fileUri = vscode.Uri.file(fullPath);
	const content = await vscode.workspace.fs.readFile(fileUri);
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(content);
}

function processFileContent(fileContent, relativePath) {
	const relativePathLower = relativePath.toLowerCase();
	const fileName = path.basename(relativePathLower);
	const lines = fileContent.split('\n');
	let i = 0;
	let inMultiLineComment = false;

	while (i < lines.length) {
		let line = lines[i];

		if (line.trim() === '') {
			i++;
			continue;
		}

		if (inMultiLineComment) {
			const endIndex = line.indexOf('*/');
			if (endIndex !== -1) {
				inMultiLineComment = false;
				const commentContent = line.substring(0, endIndex + 2).toLowerCase();
				if (commentContent.includes(fileName) || commentContent.includes(relativePathLower)) {
					i++;
					continue;
				} else {
					break;
				}
			} else {
				if (line.toLowerCase().includes(fileName) || line.toLowerCase().includes(relativePathLower)) {
					i++;
					continue;
				} else {
					break;
				}
			}
		} else {
			const trimmedLine = line.trim();
			if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
				const commentContent = trimmedLine.slice(2).trim().toLowerCase();
				if (commentContent.endsWith(fileName) || commentContent.endsWith(relativePathLower)) {
					i++;
					continue;
				} else {
					break;
				}
			} else if (trimmedLine.startsWith('/*')) {
				inMultiLineComment = true;
				const endIndex = trimmedLine.indexOf('*/');
				let commentContent;
				if (endIndex !== -1) {
					inMultiLineComment = false;
					commentContent = trimmedLine.substring(0, endIndex + 2).toLowerCase();
				} else {
					commentContent = trimmedLine.toLowerCase();
				}
				if (commentContent.includes(fileName) || commentContent.includes(relativePathLower)) {
					i++;
					continue;
				} else {
					break;
				}
			} else {
				break;
			}
		}
	}

	const cleanedCodeContent = lines.slice(i).join('\n');
	const codeBlockChar = '`';
	const codeBlockWord = `${codeBlockChar}${codeBlockChar}${codeBlockChar}`;
	return `${codeBlockWord}// ${relativePath}\n${cleanedCodeContent}\n${codeBlockWord}\n\n`;
}

async function formatAndSaveFile(fileUri) {
	const document = await vscode.workspace.openTextDocument(fileUri);
	const editor = await vscode.window.showTextDocument(document);
	await new Promise(resolve => setTimeout(resolve, 100));
	await vscode.commands.executeCommand('editor.action.formatDocument');
	await document.save();
}

async function writeFileContent(fileUri, content) {
	const encoder = new TextEncoder();
	const contentBytes = encoder.encode(content);

	let fileExists = false;
	try {
		await vscode.workspace.fs.stat(fileUri);
		fileExists = true;
	} catch (error) {
		// File does not exist
	}

	const parentUri = vscode.Uri.file(path.dirname(fileUri.fsPath));
	await vscode.workspace.fs.createDirectory(parentUri);
	await vscode.workspace.fs.writeFile(fileUri, contentBytes);
}

module.exports = {
	generatePrompt,
	prepareCode,
	readFileContent,
	extractFilesAndCode,
	processFileContent,
	formatAndSaveFile,
	writeFileContent
};