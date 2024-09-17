// File: ../../Dev/CodePromptGenerator/src/extension.js
const vscode = require('vscode');
const FileListProvider = require('./fileListProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Code Prompt Generator extension is now active!');

	const fileListProvider = new FileListProvider();

	// Define the drag and drop controller
	const dragAndDropController = {
		// Specify MIME types for drag and drop
		dragMimeTypes: ['application/vnd.code.tree.fileListView'],
		dropMimeTypes: [
			'application/vnd.code.tree.fileListView', // Internal drops
			'text/uri-list'                           // External drops (e.g., from Explorer)
		],

		handleDrag: (sourceElements, dataTransfer, token) => fileListProvider.handleDrag(sourceElements, dataTransfer, token),
		handleDrop: (targetElement, dataTransfer, token) => fileListProvider.handleDrop(targetElement, dataTransfer, token)
	};

	const treeView = vscode.window.createTreeView('fileListView', {
		treeDataProvider: fileListProvider,
		showCollapseAll: true,
		dragAndDropController: dragAndDropController
	});

	// Command to open the File List Manager
	let openCommand = vscode.commands.registerCommand('fileListManager.openFileList', () => {
		vscode.commands.executeCommand('workbench.view.extension.fileListManager');
	});

	// Command to add files
	let addFilesCommand = vscode.commands.registerCommand('fileListManager.addFiles', async () => {
		const selectedFiles = await vscode.window.showOpenDialog({
			canSelectMany: true,
			openLabel: 'Select Files'
		});
		if (selectedFiles) {
			const filePaths = selectedFiles.map(file => file.fsPath);
			await fileListProvider.addFiles(filePaths);
		}
	});

	// Command to clear files
	let clearFilesCommand = vscode.commands.registerCommand('fileListManager.clearFiles', () => {
		fileListProvider.clearFiles();
	});

	// Command to copy prompt
	let copyPromptCommand = vscode.commands.registerCommand('fileListManager.copyPrompt', async () => {
		const activeFiles = fileListProvider.files.filter(file => !file.disabled);
		let prompt = '';
		for (const file of activeFiles) {
			prompt += `// File: ${file.path}\n${file.content}\n\n`;
		}
		await vscode.env.clipboard.writeText(prompt + "Respond with full source code.\n\n");
		vscode.window.showInformationMessage('Prompt copied to clipboard!');
	});

	// Command to toggle file enabled/disabled
	let toggleFileCommand = vscode.commands.registerCommand('fileListManager.toggleFile', (file) => {
		fileListProvider.toggleFile(file);
	});

	// Register all commands and the treeView
	context.subscriptions.push(
		openCommand,
		addFilesCommand,
		clearFilesCommand,
		copyPromptCommand,
		toggleFileCommand,
		treeView
	);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
};
