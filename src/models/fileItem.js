// src/models/fileItem.js

const vscode = require('vscode');
const path = require('path');

/**
 * @class FileItem
 * Represents a file in the tree view.
 */
class FileItem extends vscode.TreeItem {
	/**
	 * 
	 * @param {string} label 
	 * @param {Object} file 
	 * @param {vscode.Uri} resourceUri
	 * @param {vscode.TreeItemCollapsibleState} collapsibleState 
	 * @param {string} extensionPath - The root path of the extension
	 */
	constructor(label, file, resourceUri, collapsibleState = vscode.TreeItemCollapsibleState.None, extensionPath) {
		super(label, collapsibleState);
		this.file = file; // Store the file object for reference

		// Set the resourceUri to let VS Code handle the icon based on file type
		this.resourceUri = vscode.Uri.file(file.fullPath);

		// Set tooltip and description
		this.tooltip = file.path;
		this.description = file.disabled ? 'Disabled' : '';

		// Context value for commands
		this.contextValue = file.disabled ? 'disabledFile' : 'enabledFile';

		// Optional: Add a strike-through effect for disabled files
		this.opacity = file.disabled ? 0.5 : 1.0;

		// Command to toggle enable/disable
		this.command = {
			command: 'fileListManager.toggleFile',
			title: 'Toggle Enable/Disable',
			arguments: [this]
		};

		// Set the icon based on the disabled state
		if (file.disabled) {
			this.iconPath = {
				light: path.join(extensionPath, 'resources', 'disabled-light.svg'),
				dark: path.join(extensionPath, 'resources', 'disabled-dark.svg')
			};
		} else {
			// Optional: Explicitly set to undefined to use default icons
			this.iconPath = undefined;
		}
	}
}

module.exports = {
	FileItem
};
