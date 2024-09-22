const vscode = require('vscode');
const path = require('path');

class FileItem extends vscode.TreeItem {
	constructor(label, file, resourceUri, collapsibleState = vscode.TreeItemCollapsibleState.None, extensionPath) {
		super(label, collapsibleState);
		this.file = file;

		this.resourceUri = vscode.Uri.file(file.fullPath);

		this.tooltip = file.path;
		this.description = file.disabled ? 'Disabled' : '';

		this.contextValue = file.disabled ? 'disabledFile' : 'enabledFile';

		this.opacity = file.disabled ? 0.5 : 1.0;

		this.command = {
			command: 'fileListManager.toggleFile',
			title: 'Toggle Enable/Disable',
			arguments: [this]
		};

		if (file.disabled) {
			this.iconPath = {
				light: path.join(extensionPath, 'resources', 'disabled-light.svg'),
				dark: path.join(extensionPath, 'resources', 'disabled-dark.svg')
			};
		} else {
			this.iconPath = undefined;
		}
	}
}

module.exports = {
	FileItem
};