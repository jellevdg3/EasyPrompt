const vscode = require('vscode');
const FileListProvider = require('./providers/fileListProvider');
const DragAndDropController = require('./controllers/dragAndDropController');
const registerCommands = require('./commands/index');
const CodeGeneratorViewProvider = require('./providers/codeGeneratorViewProvider');
const NewViewProvider = require('./providers/newViewProvider');
const path = require('path');
const fs = require('fs').promises;

function activate(context) {
	console.log('Code Prompt Generator extension is now active!');

	const extensionPath = context.extensionPath;
	const fileListProvider = new FileListProvider(extensionPath);

	const dragAndDrop = {
		dragMimeTypes: ['application/vnd.code.tree.fileListView'],
		dropMimeTypes: [
			'application/vnd.code.tree.fileListView',
			'text/uri-list'
		],
		handleDrag: (sourceElements, dataTransfer, token) => {
			console.log('Handle drag initiated');
			return DragAndDropController.handleDrag(fileListProvider, sourceElements, dataTransfer, token);
		},
		handleDrop: (targetElement, dataTransfer, token) => {
			console.log('Handle drop initiated');
			return DragAndDropController.handleDrop(fileListProvider, targetElement, dataTransfer, token);
		}
	};

	const treeView = vscode.window.createTreeView('fileListView', {
		treeDataProvider: fileListProvider,
		showCollapseAll: true,
		// @ts-ignore
		dragAndDropController: dragAndDrop
	});

	const commands = registerCommands(fileListProvider);

	const codeGeneratorViewProvider = new CodeGeneratorViewProvider(context, fileListProvider);
	codeGeneratorViewProvider.register('codeGeneratorView');

	const newViewProvider = new NewViewProvider(context);
	vscode.window.registerWebviewViewProvider('newHtmlView', newViewProvider);

	context.subscriptions.push(...commands, codeGeneratorViewProvider, newViewProvider, treeView);

	vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator').then(() => {
		vscode.commands.executeCommand('fileListManager.openFileList');
	});

	vscode.commands.registerCommand('fileListManager.openNewView', async () => {
		console.log('fileListManager.openNewView command invoked');
		const panel = vscode.window.createWebviewPanel(
			'newView',
			'New View',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'resources')]
			}
		);

		const htmlPath = path.join(context.extensionPath, 'resources', 'EastGPT', 'index.html');
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

				const scriptPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'EastGPT', scriptSrc));
				const scriptUri = panel.webview.asWebviewUri(scriptPath);

				const stylePath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'EastGPT', styleHref));
				const styleUri = panel.webview.asWebviewUri(stylePath);

				html = html.replace(scriptMatch[1], scriptUri.toString());
				html = html.replace(styleMatch[1], styleUri.toString());

				console.log(scriptUri.toString());
				console.log(styleUri.toString());

				console.log(html);
			}
			else {
				throw new Error('Script or stylesheet link tag not found in the HTML file');
			}

			const errorHandlingScript = `
				<script>
					const vscode = acquireVsCodeApi();
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
			console.log('New view panel created successfully');

			panel.webview.onDidReceiveMessage(message => {
				if (message.type === 'error') {
					const { message: msg, source, lineno, colno, error } = message;
					console.error(`Webview Panel Error: ${msg} at ${source}:${lineno}:${colno}\n${error}`);
					vscode.window.showErrorMessage(`Webview Panel Error: ${msg}`);
				} else if (message.type === 'info') {
					console.log(`Webview Panel Info: ${message.message}`);
				}
			});
		} catch (error) {
			console.error(`Failed to load new view: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to load new view: ${error.message}`);
		}
	});
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
