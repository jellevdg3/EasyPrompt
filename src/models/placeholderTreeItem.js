const vscode = require('vscode');

class PlaceholderTreeItem extends vscode.TreeItem {
	constructor() {
		super('Drag files here to start', vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'placeholder';
		this.description = '';
		this.command = undefined;
		this.tooltip = 'No files added yet. Drag and drop files or use the "Add Files" button.';
	}
}

module.exports = {
	PlaceholderTreeItem
};