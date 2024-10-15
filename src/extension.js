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
			{}
		);

		const htmlPath = path.join(context.extensionPath, 'resources', 'newView.html');
		try {
			const html = await fs.readFile(htmlPath, 'utf8');
			panel.webview.html = html;
			console.log('New view panel created successfully');
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