const vscode = require('vscode');
const FileListProvider = require('./providers/fileListProvider');
const DragAndDropController = require('./controllers/dragAndDropController');
const registerCommands = require('./commands/index');
const CodeGeneratorViewProvider = require('./providers/codeGeneratorViewProvider');

/**
 * @filePath src/extension.js
 * Main entry point for the Code Prompt Generator extension.
 */

function activate(context) {
	console.log('Code Prompt Generator extension is now active!');

	const extensionPath = context.extensionPath; // Get the extension's root path
	const fileListProvider = new FileListProvider(extensionPath); // Initialize FileListProvider

	const dragAndDrop = {
		dragMimeTypes: ['application/vnd.code.tree.fileListView'],
		dropMimeTypes: [
			'application/vnd.code.tree.fileListView',
			'text/uri-list'
		],
		handleDrag: (sourceElements, dataTransfer, token) =>
			DragAndDropController.handleDrag(fileListProvider, sourceElements, dataTransfer, token),
		handleDrop: (targetElement, dataTransfer, token) =>
			DragAndDropController.handleDrop(fileListProvider, targetElement, dataTransfer, token)
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

	// Register the CodeGeneratorViewProvider
	const codeGeneratorViewProvider = new CodeGeneratorViewProvider(context, fileListProvider); // Pass fileListProvider
	codeGeneratorViewProvider.register('codeGeneratorView'); // Pass the new view ID
	context.subscriptions.push(codeGeneratorViewProvider);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};