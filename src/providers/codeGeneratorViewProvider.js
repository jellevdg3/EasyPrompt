const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { extractFilePathFromContent, normalizePath, FILE_PATH_REGEXES } = require('../utils/pathUtils');
const { validateInput, prepareFile, writeFileContent, formatAndSaveFile } = require('../utils/fileUtils');
const { generatePrompt } = require('../utils/promptUtils');

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
		this.APPEND_LINE_KEY = 'codeGenerator.appendLine'; // Storage key for append line
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

		// Send the stored appendLine value to the webview
		const storedAppendLine = this.context.globalState.get(this.APPEND_LINE_KEY, '');
		webviewView.webview.postMessage({
			command: 'setAppendLine',
			appendLine: storedAppendLine
		});

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'writeCodeToFile':
						await this.handleWriteCodeToFile(message.filePath, message.code);
						break;
					case 'extractFilePath':
						await this.extractAndPopulateFilePath(message.code);
						break;
					case 'copyPrompt':
						await this.handleCopyPrompt(message.appendLine);
						break;
					case 'saveAppendLine': // New case for saving append line
						await this.saveAppendLine(message.appendLine);
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
	async handleWriteCodeToFile(filePathRaw, codeContentRaw) {
		const isValid = await validateInput(filePathRaw, codeContentRaw, this.view, this.context);
		if (!isValid) {
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
			return;
		}

		const { absolutePath, codeContent } = prepareFile(filePathRaw, codeContentRaw, this.context);
		const fileUri = vscode.Uri.file(absolutePath);

		try {
			await writeFileContent(fileUri, codeContent);
			await formatAndSaveFile(fileUri);
			this.view.webview.postMessage({ command: 'writeToFileSuccess' });
		} catch (error) {
			console.error(`Error writing file ${absolutePath}: ${error}`);
			vscode.window.showErrorMessage(`Failed to write file: ${absolutePath}`);
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
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
			const activeFiles = this.getActiveFiles();
			if (activeFiles.length === 0) {
				vscode.window.showInformationMessage('No active files to generate the prompt.');
				this.view.webview.postMessage({
					command: 'copyPromptFailure'
				});
				return;
			}

			const prompt = await generatePrompt(activeFiles, appendLine);
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

	/**
	 * Retrieves the list of active (enabled) files.
	 * @returns {Array}
	 */
	getActiveFiles() {
		return this.fileListProvider.files.filter(file => !file.disabled);
	}

	/**
	 * Saves the append line to global state.
	 * @param {string} appendLine 
	 */
	async saveAppendLine(appendLine) {
		try {
			await this.context.globalState.update(this.APPEND_LINE_KEY, appendLine);
		} catch (error) {
			console.error(`Error saving appendLine: ${error}`);
			vscode.window.showErrorMessage('Failed to save the append line.');
		}
	}
}

module.exports = CodeGeneratorViewProvider;