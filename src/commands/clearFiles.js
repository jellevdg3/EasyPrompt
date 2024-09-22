const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.clearFiles', () => {
		fileListProvider.clearFiles();
	});
}

module.exports = {
	registerCommand
};