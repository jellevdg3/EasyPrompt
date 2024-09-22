const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.addFiles', async () => {
		const selectedFiles = await vscode.window.showOpenDialog({
			canSelectMany: true,
			openLabel: 'Select Files',
			filters: {
				'All Files': ['*']
			}
		});
		if (selectedFiles) {
			const filePaths = selectedFiles.map(file => file.fsPath);
			await fileListProvider.addFiles(filePaths);
		}
	});
}

module.exports = {
	registerCommand
};