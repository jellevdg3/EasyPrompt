const vscode = require('vscode');
const path = require('path');

/**
 * @class FolderItem
 * Represents a folder in the tree view.
 */
class FolderItem extends vscode.TreeItem {
	/**
	 * 
	 * @param {string} label 
	 * @param {vscode.TreeItemCollapsibleState} collapsibleState 
	 * @param {Array} children 
	 * @param {vscode.Uri} resourceUri
	 */
	constructor(label, collapsibleState, children = [], resourceUri) {
		super(label, collapsibleState);
		this.contextValue = 'folderItem';
		this.children = children;

		// Set the resourceUri to let VS Code handle the folder icon
		this.resourceUri = resourceUri;

		// Tooltip
		this.tooltip = `Folder: ${label}`;

		// Command to toggle enable/disable
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
