// File: code-prompt-generator/fileListProvider.js
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
		this.iconPath = {
			light: path.join(__dirname, 'resources', 'light', 'placeholder.svg'),
			dark: path.join(__dirname, 'resources', 'dark', 'placeholder.svg')
		};
		this.tooltip = 'Drag and drop files to begin.';
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
		this.iconPath = {
			light: path.join(__dirname, 'resources', 'light', 'folder.svg'),
			dark: path.join(__dirname, 'resources', 'dark', 'folder.svg')
		};
	}
}

class FileItem extends vscode.TreeItem {
	constructor(label, file, collapsibleState = vscode.TreeItemCollapsibleState.None, command = undefined) {
		super(label, collapsibleState);
		this.command = command;
		this.contextValue = file.disabled ? 'disabledFile' : 'enabledFile';
		this.tooltip = file.path;
		this.file = file; // Store the file object for reference
		this.iconPath = {
			light: path.join(__dirname, 'resources', 'light', 'file.svg'),
			dark: path.join(__dirname, 'resources', 'dark', 'file.svg')
		};
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
					const label = file.disabled ? `~ ${name}` : name;
					const fileItem = new FileItem(label, file);
					return fileItem;
				} else {
					const folderItem = new FolderItem(
						name,
						vscode.TreeItemCollapsibleState.Expanded // Changed from Collapsed to Expanded
					);
					folderItem.children = convertToTreeItems(item.__children, fullPath);
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
			try {
				const content = await fs.promises.readFile(filePath, 'utf8');
				const relativePath = path.relative(basePath, filePath);
				// Normalize path separators to '/'
				const normalizedPath = relativePath.split(path.sep).join('/');
				// Avoid duplicates
				if (!this.files.find(f => f.path === normalizedPath)) {
					this.files.push({ path: normalizedPath, content: content, disabled: false });
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

	toggleFile(file) {
		if (file) { // Defensive check
			file.disabled = !file.disabled;
			this.refresh();
		} else {
			vscode.window.showErrorMessage('Unable to toggle file: File is undefined.');
		}
	}

	// Drag and Drop Methods remain unchanged
	async handleDrag(sourceElements, dataTransfer, token) {
		return sourceElements.map(el => el.file.path);
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
			console.error(`Error reading file ${error}`);
			vscode.window.showErrorMessage(`Failed to read file: ${error}`);
		}

		this.refresh();
	}
}

module.exports = FileListProvider;
