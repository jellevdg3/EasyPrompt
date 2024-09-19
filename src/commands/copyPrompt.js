const vscode = require('vscode');
const path = require('path');

/**
 * @filePath src/commands/copyPrompt.js
 * Handles the "Copy Prompt" command.
 *
 * Note: This command is now primarily handled within the CodeGeneratorViewProvider.
 * The command remains for backward compatibility or external invocation.
 */

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.copyPrompt', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to generate the prompt.');
			return;
		}

		const activeFiles = fileListProvider.files.filter(file => !file.disabled);
		if (activeFiles.length === 0) {
			vscode.window.showInformationMessage('No active files to generate the prompt.');
			return;
		}

		let prompt = '';
		for (const file of activeFiles) {
			try {
				const fileUri = vscode.Uri.file(file.fullPath);
				const content = await vscode.workspace.fs.readFile(fileUri);
				const decoder = new TextDecoder('utf-8');
				let fileContent = decoder.decode(content);

				// Remove initial comments containing the file name or path
				const relativePath = file.path; // e.g., 'src/commands/copyPrompt.js'
				const fileName = path.basename(relativePath); // 'copyPrompt.js'
				const fileNameLower = fileName.toLowerCase();
				const relativePathLower = relativePath.toLowerCase();

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
							if (commentContent.includes(fileNameLower) || commentContent.includes(relativePathLower)) {
								i++;
								continue;
							} else {
								break;
							}
						} else {
							if (line.toLowerCase().includes(fileNameLower) || line.toLowerCase().includes(relativePathLower)) {
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
							if (commentContent.endsWith(fileNameLower) || commentContent.endsWith(relativePathLower)) {
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
							if (commentContent.includes(fileNameLower) || commentContent.includes(relativePathLower)) {
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

				fileContent = lines.slice(i).join('\n');

				prompt += `\`\`\`// ${file.path}\n${fileContent}\n\`\`\`\n\n`;
			} catch (error) {
				console.error(`Error reading file ${file.path}: ${error} `);
				vscode.window.showErrorMessage(`Failed to read file: ${file.path} `);
			}
		}
		await vscode.env.clipboard.writeText(prompt);
	});
}

module.exports = {
	registerCommand
};