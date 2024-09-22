const vscode = require('vscode');
const path = require('path');

class FolderItem extends vscode.TreeItem {
	constructor(label, collapsibleState, children = [], resourceUri) {
		super(label, collapsibleState);
		this.contextValue = 'folderItem';
		this.children = children;

		this.resourceUri = resourceUri;

		this.tooltip = `Folder: ${label}`;

		this.command = {
			command: 'fileListManager.toggleFile',
			title: 'Toggle Enable/Disable',
			arguments: [this]
		};
	}
}

module.exports = {
	FolderItem
};