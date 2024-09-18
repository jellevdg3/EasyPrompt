// src/models/folderItem.js
const vscode = require('vscode');

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
	 */
	constructor(label, collapsibleState, children = []) {
		super(label, collapsibleState);
		this.contextValue = 'folderItem';
		this.children = children;
		this.iconPath = new vscode.ThemeIcon('folder'); // Using a built-in icon
		this.command = {
			command: 'fileListManager.toggleFile',
			title: 'Toggle Enable/Disable',
			arguments: [this]
		};
		// Determine if all child files are disabled to set folder color
		const allChildrenDisabled = children.length > 0 && children.every(child => child.file && child.file.disabled);
		this.color = allChildrenDisabled ? 'gray' : undefined;
		this.tooltip = `Folder: ${label}`;
	}
}

module.exports = {
	FolderItem
};
