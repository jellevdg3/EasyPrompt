const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.toggleFile', (element) => {
		fileListProvider.toggleFile(element);
	});
}

module.exports = {
	registerCommand
};