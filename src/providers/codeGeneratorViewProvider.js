const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { extractFilePathFromContent, normalizePath, FILE_PATH_REGEXES } = require('../utils/pathUtils');
const { validateInput, prepareFile, writeFileContent, formatAndSaveFile } = require('../utils/fileUtils');
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

	async extractAndPopulateFilePath(codeContentRaw) {
		const codeContent = codeContentRaw.trim();
		if (!codeContent) {
			return;
		}

		const extractedFilePath = extractFilePathFromContent(codeContent);
		if (extractedFilePath) {
			const cleanedCodeContent = this.removeFilePathLine(codeContent);
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: extractedFilePath,
				cleanedCode: cleanedCodeContent
			});
		}
	}

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
					lines.splice(i, 1);
					return lines.join('\n').trim();
				}
			}

			break;
		}

		return content;
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