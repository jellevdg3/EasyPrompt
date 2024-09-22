const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.openFileList', () => {
		vscode.commands.executeCommand('workbench.view.extension.codePromptGenerator');
	});
}

module.exports = {
	registerCommand
};