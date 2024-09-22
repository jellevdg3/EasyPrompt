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

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
		};

		webviewView.webview.html = await this.getHtmlForWebview(webviewView.webview);
		const storedAppendLine = this.context.globalState.get(this.APPEND_LINE_KEY, '');
		webviewView.webview.postMessage({
			command: 'setAppendLine',
			appendLine: storedAppendLine
		});

		webviewView.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'writeCodeToFile':
						await this.handleWriteCodeToFile(message.content);
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
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	async handleWriteCodeToFile(rawContent) {
		const isValid = await validateInput(rawContent, this.view);
		if (!isValid) {
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
			return;
		}

		const preparedFiles = prepareFiles(rawContent);
		const writePromises = preparedFiles.map(async ({ absolutePath, codeContent }) => {
			const fileUri = vscode.Uri.file(absolutePath);
			try {
				await writeFileContent(fileUri, codeContent);
				await formatAndSaveFile(fileUri);
			} catch (error) {
				throw new Error(`Failed to write file: ${absolutePath}`);
			}
		});

		try {
			await Promise.all(writePromises);
			this.view.webview.postMessage({ command: 'writeToFileSuccess' });
		} catch (error) {
			vscode.window.showErrorMessage(error.message);
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
		}
	}

	async extractAndPopulateFilePath(rawContent) {
		const extractedFiles = extractPathsAndCodeFromContent(rawContent.trim());
		if (extractedFiles.length > 1) {
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: '[Multiple Files Detected]',
				cleanedCode: rawContent
			});
		} else if (extractedFiles.length === 1) {
			const { filePath, code } = extractedFiles[0];
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: filePath,
				cleanedCode: code
			});
		} else {
		}
	}

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
			vscode.window.showErrorMessage('Failed to copy prompt.');
			this.view.webview.postMessage({
				command: 'copyPromptFailure'
			});
		}
	}

	getActiveFiles() {
		return this.fileListProvider.files.filter(file => !file.disabled);
	}

	async saveAppendLine(appendLine) {
		try {
			await this.context.globalState.update(this.APPEND_LINE_KEY, appendLine);
		} catch (error) {
			vscode.window.showErrorMessage('Failed to save the append line.');
		}
	}
}

module.exports = CodeGeneratorViewProvider;