const vscode = require('vscode');
const path = require('path');

async function generatePrompt(activeFiles, appendLine) {
	let prompt = '';
	for (const file of activeFiles) {
		try {
			const fileContent = await readFileContent(file.fullPath);
			const processedContent = processFileContent(fileContent, file.path);
			prompt += processedContent;
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to read file: ${file.path}`);
		}
	}

	if (appendLine && appendLine.trim() !== '') {
		prompt += appendLine.trim() + '\n\n\n';
	}

	return prompt;
}

async function readFileContent(fullPath) {
	const fileUri = vscode.Uri.file(fullPath);
	const content = await vscode.workspace.fs.readFile(fileUri);
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(content);
}

function processFileContent(fileContent, relativePath) {
	const fileName = path.basename(relativePath);
	const fileNameLower = fileName.toLowerCase();
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
				if (commentContent.includes(fileNameLower)) {
					i++;
					continue;
				} else {
					break;
				}
			} else {
				if (line.toLowerCase().includes(fileNameLower)) {
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
				if (commentContent.endsWith(fileNameLower)) {
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
				if (commentContent.includes(fileNameLower)) {
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
	return `--- ${relativePath} ---\n${codeBlockWord}\n${cleanedCodeContent}\n${codeBlockWord}\n\n`;
}

module.exports = {
	generatePrompt,
	readFileContent,
	processFileContent
};