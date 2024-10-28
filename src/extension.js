const vscode = require('vscode');
const FileListProvider = require('./providers/fileListProvider');
const DragAndDropController = require('./controllers/dragAndDropController');
const registerCommands = require('./commands/index');
const CodeGeneratorViewProvider = require('./providers/codeGeneratorViewProvider');
const NewViewProvider = require('./providers/newViewProvider');
const NewViewManager = require('./controllers/gptViewManager');
const path = require('path');
const fs = require('fs').promises;

function activate(context) {
	console.log('Code Prompt Generator extension is now active!');

	const extensionUri = context.extensionUri;
	const fileListProvider = new FileListProvider(extensionUri.fsPath);

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

	const newViewManager = new NewViewManager(context, fileListProvider);
	const newViewProvider = new NewViewProvider(newViewManager);
	vscode.window.registerWebviewViewProvider('newHtmlView', newViewProvider);

	const codeGeneratorViewProvider = new CodeGeneratorViewProvider(context, fileListProvider);
	codeGeneratorViewProvider.register('codeGeneratorView');

	context.subscriptions.push(...commands, codeGeneratorViewProvider, newViewProvider, treeView, newViewManager);

	vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator').then(() => {
		vscode.commands.executeCommand('fileListManager.openFileList');
	});
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};