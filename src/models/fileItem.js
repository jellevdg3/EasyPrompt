// src/models/fileItem.js
const vscode = require('vscode');

/**
 * @class FileItem
 * Represents a file in the tree view.
 */
class FileItem extends vscode.TreeItem {
	/**
	 * 
	 * @param {string} label 
	 * @param {Object} file 
	 * @param {vscode.TreeItemCollapsibleState} collapsibleState 
	 */
	constructor(label, file, collapsibleState = vscode.TreeItemCollapsibleState.None) {
		super(label, collapsibleState);
		this.contextValue = file.disabled ? 'disabledFile' : 'enabledFile';
		this.tooltip = file.path;
		this.file = file; // Store the file object for reference
		this.iconPath = new vscode.ThemeIcon(file.disabled ? 'circle-slash' : 'file'); // Dynamic icon based on state
		this.command = {
			command: 'fileListManager.toggleFile',
			title: 'Toggle Enable/Disable',
			arguments: [this]
		};
		this.color = file.disabled ? 'gray' : undefined;
	}
}

module.exports = {
	FileItem
};
