const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { extractFilePathFromContent, normalizePath, FILE_PATH_REGEXES } = require('../utils/pathUtils');
const { validateInput, prepareFile, writeFileContent, formatAndSaveFile, removeFilePathLine } = require('../utils/fileUtils');
const { generatePrompt, prepareCode } = require('../utils/promptUtils');
const codePrepUtils = require('../utils/codePrepUtils');

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
						await this.handleWriteCodeToFile(message.filePath, message.code);
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

	async handleWriteCodeToFile(filePathRaw, codeContentRaw) {
		const isValid = await validateInput(filePathRaw, codeContentRaw, this.view, this.context);
		if (!isValid) {
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
			return;
		}

		// Use the new prepareCode method from promptUtils which utilizes codePrepUtils
		const prepResult = await prepareCode(codeContentRaw, this.context);
		if (!prepResult.success) {
			this.view.webview.postMessage({ command: 'writeToFileFailure' });
			return;
		}

		this.view.webview.postMessage({ command: 'writeToFileSuccess' });
	}

	async extractAndPopulateFilePath(codeContentRaw) {
		const codeContent = codeContentRaw.trim();
		if (!codeContent) {
			return;
		}

		const extractedFilePath = extractFilePathFromContent(codeContent);
		if (extractedFilePath) {
			const cleanedCodeContent = removeFilePathLine(codeContent);
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: extractedFilePath,
				cleanedCode: cleanedCodeContent
			});
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
			console.error(`Error copying prompt: ${error}`);
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
			console.error(`Error saving appendLine: ${error}`);
			vscode.window.showErrorMessage('Failed to save the append line.');
		}
	}
}

module.exports = CodeGeneratorViewProvider;