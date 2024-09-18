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
		// @ts-ignore
		dragAndDropController: dragAndDropController
	});

	// Command to open the Code Prompt Generator Window
	let openCommand = vscode.commands.registerCommand('fileListManager.openFileList', () => {
		vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator'); // Updated container ID
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
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to generate the prompt.');
			return;
		}

		const activeFiles = fileListProvider.files.filter(file => !file.disabled);
		if (activeFiles.length === 0) {
			vscode.window.showInformationMessage('No active files to generate the prompt.');
			return;
		}

		let prompt = '';
		for (const file of activeFiles) {
			try {
				const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, file.path);
				const content = await vscode.workspace.fs.readFile(fileUri);
				const decoder = new TextDecoder('utf-8');
				const fileContent = decoder.decode(content);
				prompt += `--- ${file.path} ---\n\`\`\`${fileContent}\`\`\`\n\n`;
			} catch (error) {
				console.error(`Error reading file ${file.path}: ${error}`);
				vscode.window.showErrorMessage(`Failed to read file: ${file.path}`);
			}
		}
		await vscode.env.clipboard.writeText(prompt);
		vscode.window.showInformationMessage('Prompt copied to clipboard!');
	});

	// Command to toggle file/folder enabled/disabled
	let toggleFileCommand = vscode.commands.registerCommand('fileListManager.toggleFile', (element) => {
		fileListProvider.toggleFile(element);
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
