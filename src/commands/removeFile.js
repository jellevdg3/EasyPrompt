const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.removeFile', (element) => {
		if (element && element.file) {
			fileListProvider.removeFile(element.file.path);
		} else {
			vscode.window.showErrorMessage('Unable to remove file: Invalid element.');
		}
	});
}

module.exports = {
	registerCommand
};