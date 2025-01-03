const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { generatePrompt } = require('../utils/promptUtils');
const { validateInput, prepareFiles, writeFileContent, formatAndSaveFile } = require('../utils/fileUtils');

class NewViewManager {
	constructor(context, fileListProvider) {
		this.context = context;
		this.fileListProvider = fileListProvider;
		this.disposables = [];
		this.panelIdMap = new WeakMap();
		this.registerCommands();

		this.APPEND_LINE_KEY = 'codeGenerator.appendLine';
	}

	registerCommands() {
		const disposable = vscode.commands.registerCommand('fileListManager.openNewView', this.openNewView.bind(this));
		this.disposables.push(disposable);
	}

	async openNewView(savedState = null) {
		const panelId = savedState ? savedState.id : uuidv4();
		const panel = vscode.window.createWebviewPanel(
			'newView',
			'GPT',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
			},
		);

		this.panelIdMap.set(panel, panelId);
		await this.setupPanel(panel, panelId);

		panel.onDidDispose(() => {
			this.panelIdMap.delete(panel);
		}, null, this.disposables);

		this.context.subscriptions.push({
			serialize() {
				return { id: panelId };
			}
		});
	}

	async restorePanel(panel, savedState) {
		const panelId = savedState ? savedState.id : uuidv4();
		this.panelIdMap.set(panel, panelId);

		panel.onDidDispose(() => {
			this.panelIdMap.delete(panel);
		}, null, this.disposables);

		await this.setupPanel(panel, panelId);
	}

	async setupPanel(panel, panelId) {
		const htmlPath = path.join(this.context.extensionPath, 'resources', 'EastGPT', 'index.html');
		try {
			let html = await fs.readFile(htmlPath, 'utf8');

			const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/;
			const styleRegex = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/;

			const scriptMatch = html.match(scriptRegex);
			const styleMatch = html.match(styleRegex);

			if (scriptMatch && styleMatch) {
				let scriptSrc = scriptMatch[1];
				let styleHref = styleMatch[1];

				if (scriptSrc.startsWith('/')) scriptSrc = scriptSrc.substring(1);
				if (styleHref.startsWith('/')) styleHref = styleHref.substring(1);

				const scriptPath = vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'EastGPT', scriptSrc));
				const scriptUri = panel.webview.asWebviewUri(scriptPath);

				const stylePath = vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'EastGPT', styleHref));
				const styleUri = panel.webview.asWebviewUri(stylePath);

				html = html.replace(scriptMatch[1], scriptUri.toString());
				html = html.replace(styleMatch[1], styleUri.toString());

				html = html.replace('</body>', `<script>
					window.panelId = '${panelId}';
				</script></body>`);
			}
			else {
				throw new Error('Script or stylesheet link tag not found in the HTML file');
			}

			const errorHandlingScript = `
				<script>
					window.addEventListener('load', () => {
						console.log('Main script loaded successfully');
						vscode.postMessage({ type: 'info', message: 'Webview panel page loaded' });
					});
					window.onerror = function(message, source, lineno, colno, error) {
						vscode.postMessage({
							type: 'error',
							message: message,
							source: source,
							lineno: lineno,
							colno: colno,
							error: error ? error.stack : null
						});
					};
					window.addEventListener('unhandledrejection', function(event) {
						vscode.postMessage({
							type: 'error',
							message: event.reason ? event.reason.message : 'Unhandled rejection',
							error: event.reason ? event.reason.stack : null
						});
					});
				</script>
			</body>`;
			html = html.replace('</body>', errorHandlingScript);

			panel.webview.html = html;

			console.log('New view panel set up successfully');

			panel.webview.onDidReceiveMessage(async message => {
				if (message.type === 'error') {
					const { message: msg, source, lineno, colno, error } = message;
					console.error(`Webview Panel Error: ${msg} at ${source}:${lineno}:${colno}\n${error}`);
					vscode.window.showErrorMessage(`Webview Panel Error: ${msg}`);
				} else if (message.type === 'info') {
					console.log(`Webview Panel Info: ${message.message}`);
				} else if (message.type === 'generatePrompt') {
					console.log('Received generatePrompt message', message.data.prefixWithPrompt);
					const prefixWithPrompt = message.data.prefixWithPrompt;
					await this.handleGeneratePrompt(message.id, panel, prefixWithPrompt);
				} else if (message.type === 'writeCode') {
					console.log("Received writeCode message", message.data);
					await this.handleWriteCode(message.data, panel);
				} else if (message.type === 'openNewChat') {
					console.log('Received openNewChat message');
					await this.openNewView();
				}
				else {
					console.log(`Unknown message type: ${message.type}`);
				}
			});
		} catch (error) {
			console.error(`Failed to load new view: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to load new view: ${error.message}`);
		}
	}

	async handleGeneratePrompt(id, panel, prefixWithPrompt) {
		try {
			const activeFiles = this.fileListProvider.files.filter(file => !file.disabled);
			if (activeFiles.length === 0) {
				panel.webview.postMessage({ id, type: 'error', message: 'No active files to generate the prompt.' });
				return;
			}

			const storedAppendLine = this.context.globalState.get(this.APPEND_LINE_KEY, '');
			let prompt = await generatePrompt(activeFiles);
			if (prefixWithPrompt) {
				prompt += storedAppendLine + '\n';
			}
			console.log(prompt);
			panel.webview.postMessage({ id, type: 'generatePrompt', code: prompt });
		} catch (error) {
			console.error('Failed to generate prompt:', error);
			panel.webview.postMessage({ type: 'error', message: 'Failed to generate prompt.' });
		}
	}

	async handleWriteCode(content, panel) {
		try {
			const isValid = await validateInput(content, panel);
			if (!isValid) {
				panel.webview.postMessage({ type: 'writeCodeFailure' });
				return;
			}

			let preparedFiles = prepareFiles(content);

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

			await Promise.all(writePromises);
			panel.webview.postMessage({ type: 'writeCodeSuccess' });
			console.log('All files written successfully');
		} catch (error) {
			vscode.window.showErrorMessage(error.message);
			panel.webview.postMessage({ type: 'writeCodeFailure' });
		}
	}

	dispose() {
		this.disposables.forEach(disposable => disposable.dispose());
	}
}

module.exports = NewViewManager;
