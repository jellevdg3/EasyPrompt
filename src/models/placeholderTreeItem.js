// src/models/placeholderTreeItem.js
const vscode = require('vscode');

/**
 * @class PlaceholderTreeItem
 * Represents a placeholder when no files are present.
 */
class PlaceholderTreeItem extends vscode.TreeItem {
	constructor() {
		super('Drag files here to start', vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'placeholder';
		this.description = '';
		// Optional: Make it non-selectable
		this.command = undefined;
		this.tooltip = 'No files added yet. Drag and drop files or use the "Add Files" button.';
	}
}

module.exports = {
	PlaceholderTreeItem
};
