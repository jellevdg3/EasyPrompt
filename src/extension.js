const vscode = require('vscode');
const FileListProvider = require('./providers/fileListProvider');
const DragAndDropController = require('./controllers/dragAndDropController');
const registerCommands = require('./commands/index');
const CodeGeneratorViewProvider = require('./providers/codeGeneratorViewProvider');

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

	const commands = registerCommands(fileListProvider);

	const codeGeneratorViewProvider = new CodeGeneratorViewProvider(context, fileListProvider);
	codeGeneratorViewProvider.register('codeGeneratorView');

	context.subscriptions.push(...commands, codeGeneratorViewProvider, treeView);

	vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator').then(() => {
		vscode.commands.executeCommand('fileListManager.openFileList');
	});
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
