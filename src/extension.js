// src/extension.js
const vscode = require('vscode');
const FileListProvider = require('./providers/fileListProvider');
const DragAndDropController = require('./controllers/dragAndDropController');

// Import command registrations
const registerCommands = require('./commands/index');

function activate(context) {
	console.log('Code Prompt Generator extension is now active!');

	const fileListProvider = new FileListProvider();

	// Define the drag and drop controller
	const dragAndDrop = {
		dragMimeTypes: ['application/vnd.code.tree.fileListView'],
		dropMimeTypes: [
			'application/vnd.code.tree.fileListView', // Internal drops
			'text/uri-list'                           // External drops (e.g., from Explorer)
		],
		handleDrag: (sourceElements, dataTransfer, token) => DragAndDropController.handleDrag(fileListProvider, sourceElements, dataTransfer, token),
		handleDrop: (targetElement, dataTransfer, token) => DragAndDropController.handleDrop(fileListProvider, targetElement, dataTransfer, token)
	};

	const treeView = vscode.window.createTreeView('fileListView', {
		treeDataProvider: fileListProvider,
		showCollapseAll: true,
		// @ts-ignore
		dragAndDropController: dragAndDrop
	});

	// Register all commands
	const commands = registerCommands(fileListProvider);
	context.subscriptions.push(...commands, treeView);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
