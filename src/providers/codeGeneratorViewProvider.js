const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { extractPathsAndCodeFromContent } = require('../utils/messageUtils');
const { validateInput, prepareFiles, writeFileContent, formatAndSaveFile } = require('../utils/fileUtils');
const { generatePrompt } = require('../utils/promptUtils');

class CodeGeneratorViewProvider {
	constructor(context, fileListProvider) {
		this.context = context;
		this.fileListProvider = fileListProvider;
		this.view = null;
		this.APPEND_LINE_KEY = 'codeGenerator.appendLine';
	}

	register(viewId) {
		vscode.window.registerWebviewViewProvider(viewId, this, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		});
	}

	async getHtmlForWebview(webview) {
		const htmlPath = path.join(this.context.extensionPath, 'resources', 'codeGeneratorView.html');
		let html = await fs.readFile(htmlPath, 'utf8');
		return html;
	}

	async resolveWebviewView(webviewView, context, token) {
		this.view = webviewView;
		console.log('Webview view resolved');

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
		};

		webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);
		console.log('Webview HTML set');

		const storedAppendLine = this.context.globalState.get(this.APPEND_LINE_KEY, '');
		webviewView.webview.postMessage({
			command: 'setAppendLine',
			appendLine: storedAppendLine
		});
		console.log('Posted setAppendLine message to webview');

		webviewView.webview.onDidReceiveMessage(
			async message => {
				console.log('Received message from webview:', message);
				switch (message.command) {
					case 'writeCodeToFile':
						await this.handleWriteCodeToFile(message.content, message.filePath);
						break;
					case 'extractFilePath':
						await this.extractAndPopulateFilePath(message.code);
						break;
					case 'copyPrompt':
						await this.handleCopyPrompt(message.appendLine);
						break;
					case 'saveAppendLine':
						await this.saveAppendLine(message.appendLine);
						break;
					case 'openNewView':
						console.log('openNewView message received');
						vscode.commands.executeCommand('fileListManager.openNewView');
						break;
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	async handleWriteCodeToFile(rawContent, fallbackFilePath) {
		console.log('Handling writeCodeToFile');
		const isValid = await validateInput(rawContent, this.view, fallbackFilePath);
		if (!isValid) {
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
			return;
		}

		let preparedFiles;
		if (fallbackFilePath && fallbackFilePath !== '[Multiple Files Detected]') {
			preparedFiles = prepareFiles(rawContent, fallbackFilePath);
		} else {
			preparedFiles = prepareFiles(rawContent);
		}

		const writePromises = preparedFiles.map(async ({ absolutePath, codeContent }) => {
			const fileUri = vscode.Uri.file(absolutePath);
			try {
				await writeFileContent(fileUri, codeContent);
				await formatAndSaveFile(fileUri);
				console.log(`File written and formatted: ${absolutePath}`);
			} catch (error) {
				console.error(`Failed to write file: ${absolutePath}`, error);
				throw new Error(`Failed to write file: ${absolutePath}`);
			}
		});

		try {
			await Promise.all(writePromises);
			this.view.webview.postMessage({ command: 'writeToFileSuccess' });
			console.log('All files written successfully');
		} catch (error) {
			vscode.window.showErrorMessage(error.message);
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
		}
	}

	async extractAndPopulateFilePath(rawContent) {
		console.log('Extracting file path from content');
		const extractedFiles = extractPathsAndCodeFromContent(rawContent.trim());
		if (extractedFiles.length > 1) {
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: '[Multiple Files Detected]',
				cleanedCode: rawContent
			});
			console.log('Multiple files detected');
		} else if (extractedFiles.length === 1) {
			let { filePath, code } = extractedFiles[0];
			filePath = filePath.replace(/^---\s*|\s*---$/g, '').trim();
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: filePath,
				cleanedCode: code
			});
			console.log(`Single file detected: ${filePath}`);
		} else {
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: '',
				cleanedCode: rawContent
			});
			console.log('No files detected');
		}
	}

	async handleCopyPrompt(appendLine) {
		console.log('Handling copyPrompt');
		try {
			const activeFiles = this.getActiveFiles();
			if (activeFiles.length === 0) {
				vscode.window.showInformationMessage('No active files to generate the prompt.');
				this.view.webview.postMessage({
					command: 'copyPromptFailure'
				});
				console.log('No active files to copy prompt');
				return;
			}

			const prompt = await generatePrompt(activeFiles, appendLine);
			await vscode.env.clipboard.writeText(prompt);
			this.view.webview.postMessage({
				command: 'copyPromptSuccess'
			});
			console.log('Prompt copied to clipboard');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to copy prompt.');
			this.view.webview.postMessage({
				command: 'copyPromptFailure'
			});
			console.error('Failed to copy prompt:', error);
		}
	}

	getActiveFiles() {
		return this.fileListProvider.files.filter(file => !file.disabled);
	}

	async saveAppendLine(appendLine) {
		console.log('Saving appendLine:', appendLine);
		try {
			await this.context.globalState.update(this.APPEND_LINE_KEY, appendLine);
			console.log('Append line saved');
		} catch (error) {
			vscode.window.showErrorMessage('Failed to save the append line.');
			console.error('Failed to save append line:', error);
		}
	}
}

module.exports = CodeGeneratorViewProvider;