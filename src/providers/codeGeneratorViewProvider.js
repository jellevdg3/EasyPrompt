const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { extractFilePathFromContent, normalizePath, FILE_PATH_REGEXES } = require('../utils/pathUtils');

/**
 * @filePath src/providers/codeGeneratorViewProvider.js
 * Webview view provider for the "Code Generator" window.
 */

class CodeGeneratorViewProvider {
	/**
	 * 
	 * @param {vscode.ExtensionContext} context 
	 * @param {Object} fileListProvider 
	 */
	constructor(context, fileListProvider) {
		this.context = context;
		this.fileListProvider = fileListProvider; // Store the reference
		this.view = null;
	}

	/**
	 * Registers the webview view provider with a given view ID.
	 * @param {string} viewId 
	 */
	register(viewId) {
		vscode.window.registerWebviewViewProvider(viewId, this, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		});
	}

	/**
	 * Returns the HTML content for the webview.
	 * Loads the HTML from a separate file.
	 * @returns {Promise<string>}
	 */
	async getHtmlForWebview(webview) {
		const htmlPath = path.join(this.context.extensionPath, 'resources', 'codeGeneratorView.html');
		let html = await fs.readFile(htmlPath, 'utf8');

		// Replace the nonce or any placeholders if necessary
		// For example, if you have scripts or styles to include securely

		return html;
	}

	/**
	 * Called by VS Code to resolve the webview view.
	 * @param {vscode.WebviewView} webviewView 
	 * @param {vscode.WebviewViewResolveContext} context 
	 * @param {vscode.CancellationToken} token 
	 */
	async resolveWebviewView(webviewView, context, token) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			// Restrict the webview to only load resources from your extension's `resources` directory.
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
		};

		webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'writeCodeToFile':
						await this.writeCodeToFile(message.filePath, message.code);
						break;
					case 'extractFilePath':
						await this.extractAndPopulateFilePath(message.code);
						break;
					case 'copyPrompt':
						await this.handleCopyPrompt(message.appendLine);
						break;
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	/**
	 * Handles writing the pasted code to a file.
	 * @param {string} filePathRaw 
	 * @param {string} codeContentRaw 
	 */
	async writeCodeToFile(filePathRaw, codeContentRaw) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
			this.view.webview.postMessage({
				command: 'writeToFileFailure'
			});
			return;
		}

		const workspaceUri = workspaceFolders[0].uri;

		const filePath = filePathRaw.trim();
		let codeContent = codeContentRaw.trim();

		if (!filePath) {
			// Inform the webview to show error
			this.view.webview.postMessage({
				command: 'showError',
				field: 'filePath',
				message: 'File path cannot be empty.'
			});
			this.view.webview.postMessage({
				command: 'writeToFileFailure'
			});
			return;
		}

		if (!codeContent) {
			vscode.window.showErrorMessage('Code content cannot be empty.');
			this.view.webview.postMessage({
				command: 'writeToFileFailure'
			});
			return;
		}

		// Extract the file path from the code content if present
		const extractedFilePath = extractFilePathFromContent(codeContent);
		if (extractedFilePath) {
			// Remove the file path line from the code content
			codeContent = this.removeFilePathLine(codeContent);
			// Optionally, you can choose to prefer the input filePath over the extracted one
			// For now, we'll use the input filePath
		}

		let filePathToUse = filePath;

		// Normalize the file path
		filePathToUse = normalizePath(filePathToUse);

		// Resolve the absolute file path
		const absolutePath = path.isAbsolute(filePathToUse)
			? filePathToUse
			: path.join(workspaceUri.fsPath, filePathToUse);

		const fileUri = vscode.Uri.file(absolutePath);

		// Prepare the content to write
		const encoder = new TextEncoder();
		const contentBytes = encoder.encode(codeContent);

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
			const parentUri = vscode.Uri.file(path.dirname(absolutePath));
			await vscode.workspace.fs.createDirectory(parentUri);

			// Write the content to the file
			await vscode.workspace.fs.writeFile(fileUri, contentBytes);

			// Clear the fields in the webview
			this.view.webview.postMessage({
				command: 'clearFields'
			});

			// **New Code Starts Here**

			// Open the newly created file in the editor
			const document = await vscode.workspace.openTextDocument(fileUri);
			const editor = await vscode.window.showTextDocument(document);

			// Wait for the editor to be ready
			await new Promise(resolve => setTimeout(resolve, 100));

			// Execute the format command on the active editor
			await vscode.commands.executeCommand('editor.action.formatDocument');

			// Save the formatted document
			await document.save();

			// **New Code Ends Here**

			// Send success message to webview
			this.view.webview.postMessage({
				command: 'writeToFileSuccess'
			});

		} catch (error) {
			console.error(`Error writing file ${filePathToUse}: ${error}`);
			vscode.window.showErrorMessage(`Failed to write file: ${filePathToUse}`);
			// Send failure message to webview
			this.view.webview.postMessage({
				command: 'writeToFileFailure'
			});
		}
	}

	/**
	 * Extracts the file path from the pasted code and sends it back to the webview.
	 * @param {string} codeContentRaw 
	 */
	async extractAndPopulateFilePath(codeContentRaw) {
		const codeContent = codeContentRaw.trim();

		if (!codeContent) {
			return;
		}

		// Extract the file path from the code content
		const extractedFilePath = extractFilePathFromContent(codeContent);

		if (extractedFilePath) {
			// Remove the file path line from the code content
			const cleanedCodeContent = this.removeFilePathLine(codeContent);

			// Send the extracted file path and cleaned code back to the webview
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: extractedFilePath,
				cleanedCode: cleanedCodeContent
			});
		}
	}

	/**
	 * Removes the first line that contains the file path from the code content.
	 * @param {string} content 
	 * @returns {string}
	 */
	removeFilePathLine(content) {
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
	 * Handles the copyPrompt command from the webview.
	 * @param {string} appendLine
	 */
	async handleCopyPrompt(appendLine) {
		try {
			const activeFiles = this.fileListProvider.files.filter(file => !file.disabled);
			if (activeFiles.length === 0) {
				vscode.window.showInformationMessage('No active files to generate the prompt.');
				this.view.webview.postMessage({
					command: 'copyPromptFailure'
				});
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

					const codeBlockChar = '`';
					const codeBlockWord = `${codeBlockChar}${codeBlockChar}${codeBlockChar}`;
					prompt += `${codeBlockWord}// ${file.path}\n${fileContent}\n${codeBlockWord}\n\n`;
				} catch (error) {
					console.error(`Error reading file ${file.path}: ${error} `);
					vscode.window.showErrorMessage(`Failed to read file: ${file.path}`);
				}
			}

			// Append the additional line if provided
			if (appendLine && appendLine.trim() !== '') {
				prompt += appendLine.trim() + '\n';
			}

			await vscode.env.clipboard.writeText(prompt);
			this.view.webview.postMessage({
				command: 'copyPromptSuccess'
			});
		} catch (error) {
			console.error(`Error copying prompt: ${error}`);
			vscode.window.showErrorMessage('Failed to copy prompt.');
			this.view.webview.postMessage({
				command: 'copyPromptFailure'
			});
		}
	}
}

module.exports = CodeGeneratorViewProvider;