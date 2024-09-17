// File: ../../Dev/CodePromptGenerator/src/fileListProvider.js
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Placeholder TreeItem displayed when no files are present.
 */
class PlaceholderTreeItem extends vscode.TreeItem {
	constructor() {
		super('Drag files here to start', vscode.TreeItemCollapsibleState.None);
		this.contextValue = 'placeholder';
		this.description = '';
		// Optional: Make it non-selectable
		this.command = undefined;
	}
}

class FolderItem extends vscode.TreeItem {
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
	}
}

class FileItem extends vscode.TreeItem {
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

class FileListProvider {
	constructor() {
		this.files = [];
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
	}

	refresh() {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element) {
		return element;
	}

	getChildren(element) {
		if (!element) {
			if (this.files.length === 0) {
				// Return the placeholder when no files are present
				return [new PlaceholderTreeItem()];
			}
			// Root level: build the tree from the flat file list
			const tree = this.buildTree(this.files);
			return tree;
		} else if (element instanceof FolderItem) {
			// If the element is a folder, return its children
			return element.children;
		}
		// If the element is a file, it has no children
		return [];
	}

	buildTree(files) {
		const root = {};

		files.forEach(file => {
			if (!file || !file.path) {
				console.warn('Encountered an undefined or malformed file object:', file);
				return;
			}
			const parts = file.path.split('/');
			let current = root;

			parts.forEach((part, index) => {
				if (!current[part]) {
					current[part] = {
						__children: {},
						__isFile: index === parts.length - 1
					};
				}
				current = current[part].__children;
			});
		});

		const convertToTreeItems = (obj, parentPath = '') => {
			return Object.keys(obj).map(name => {
				const item = obj[name];
				// Ensure consistent path separators by using '/'
				const fullPath = parentPath ? `${parentPath}/${name}` : name;

				if (item.__isFile) {
					const file = this.files.find(f => f.path === fullPath);
					if (!file) {
						console.error(`File not found for path: ${fullPath}`);
						vscode.window.showErrorMessage(`Internal error: File not found for path "${fullPath}".`);
						return new vscode.TreeItem(name); // Fallback to a basic TreeItem
					}
					const label = file.disabled ? `${name}` : name;
					const fileItem = new FileItem(label, file);
					return fileItem;
				} else {
					const children = convertToTreeItems(item.__children, fullPath);
					const folderItem = new FolderItem(
						name,
						vscode.TreeItemCollapsibleState.Expanded,
						children
					);
					return folderItem;
				}
			});
		};

		return convertToTreeItems(root);
	}

	async addFiles(filePaths) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		let basePath = '';
		if (workspaceFolders && workspaceFolders.length > 0) {
			basePath = workspaceFolders[0].uri.fsPath;
		}

		for (const filePath of filePaths) {
			if (!filePath) {
				console.warn('Encountered an undefined file path:', filePath);
				continue;
			}
			try {
				const content = await fs.promises.readFile(filePath, 'utf8');
				const relativePath = path.relative(basePath, filePath);
				// Normalize path separators to '/'
				const normalizedPath = relativePath.split(path.sep).join('/');
				// Avoid duplicates
				if (!this.files.find(f => f.path === normalizedPath)) {
					this.files.push({ path: normalizedPath, content: content, disabled: false });
				} else {
					console.info(`File already exists in the list: ${normalizedPath}`);
				}
			} catch (error) {
				console.error(`Error reading file ${filePath}: ${error}`);
				vscode.window.showErrorMessage(`Failed to read file: ${filePath}`);
			}
		}
		this.refresh();
	}

	clearFiles() {
		this.files = [];
		this.refresh();
	}

	toggleFile(element) {
		if (element instanceof FileItem) {
			if (element.file) {
				element.file.disabled = !element.file.disabled;
				this.refresh();
			} else {
				vscode.window.showErrorMessage('Unable to toggle file: File object is undefined.');
			}
		} else if (element instanceof FolderItem) {
			if (element.children && element.children.length > 0) {
				// Determine the new state based on the current state of the first child
				const anyEnabled = element.children.some(child => child.file && !child.file.disabled);
				const newState = anyEnabled; // If any child is enabled, disable all; else enable all
				element.children.forEach(child => {
					if (child.file) {
						child.file.disabled = newState;
					}
				});
				this.refresh();
			} else {
				vscode.window.showErrorMessage('Unable to toggle folder: No children found.');
			}
		} else {
			vscode.window.showErrorMessage('Unable to toggle element: Unrecognized element type.');
		}
	}

	// Drag and Drop Methods
	async handleDrag(sourceElements, dataTransfer, token) {
		if (!Array.isArray(sourceElements)) {
			console.warn('handleDrag: sourceElements is not an array:', sourceElements);
			return [];
		}
		return sourceElements.map(el => el.file && el.file.path ? el.file.path : null).filter(path => path !== null);
	}

	async handleDrop(targetElement, dataTransfer, _token) {
		try {
			const textUriList = await dataTransfer.get('text/uri-list');
			let uris = [];

			if (textUriList && typeof textUriList.value === 'string') {
				uris = textUriList.value.split(/\r?\n/).filter(line => line.trim() !== '');
			}

			const filePaths = uris.map(uri => {
				try {
					const parsedUri = vscode.Uri.parse(uri);
					return parsedUri.fsPath;
				} catch (e) {
					console.error(`Invalid URI: ${uri}`, e);
					return null;
				}
			}).filter(path => path !== null);

			if (filePaths.length > 0) {
				await this.addFiles(filePaths);
			}

			// Handle internal drop if needed
			const internalData = await dataTransfer.get('application/vnd.code.tree.fileListView');
			if (internalData) {
				console.log("Internal drop data:", internalData);
				// Process internal data as required
			}

		} catch (error) {
			console.error(`Error handling drop: ${error}`);
			vscode.window.showErrorMessage(`Failed to handle drop: ${error}`);
		}

		this.refresh();
	}
}

module.exports = FileListProvider;
