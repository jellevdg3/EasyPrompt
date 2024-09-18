const path = require('path');
const vscode = require('vscode');
const { PlaceholderTreeItem } = require('../models/placeholderTreeItem');
const { FolderItem } = require('../models/folderItem');
const { FileItem } = require('../models/fileItem');
const pathUtils = require('../utils/pathUtils');

class FileListProvider {
	/**
	 * @param {string} extensionPath - The root path of the extension
	 */
	constructor(extensionPath) {
		this.files = [];
		this.extensionPath = extensionPath; // Store the extension path
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
				return [new PlaceholderTreeItem()];
			}
			const tree = this.buildTree(this.files);
			return tree;
		} else if (element instanceof FolderItem) {
			return element.children;
		}
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
				const fullPath = parentPath ? `${parentPath}/${name}` : name;

				if (item.__isFile) {
					const file = this.files.find(f => f.path === fullPath);
					if (!file) {
						console.error(`File not found for path: ${fullPath}`);
						vscode.window.showErrorMessage(`Internal error: File not found for path "${fullPath}".`);
						return new vscode.TreeItem(name);
					}

					const fileUri = vscode.Uri.file(file.fullPath); // Use absolute path
					const label = file.disabled ? `${name}` : name;
					const fileItem = new FileItem(label, file, fileUri, vscode.TreeItemCollapsibleState.None, this.extensionPath);
					return fileItem;
				} else {
					const folderUri = vscode.Uri.file(path.join(this.getWorkspacePath(), fullPath));
					const children = convertToTreeItems(item.__children, fullPath);
					const folderItem = new FolderItem(
						name,
						vscode.TreeItemCollapsibleState.Expanded,
						children,
						folderUri
					);
					return folderItem;
				}
			});
		};

		return convertToTreeItems(root);
	}

	getWorkspacePath() {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			return workspaceFolders[0].uri.fsPath;
		}
		return '';
	}

	async addFiles(filePaths) {
		const workspacePath = this.getWorkspacePath();
		if (!workspacePath) {
			vscode.window.showErrorMessage('No workspace is open.');
			return;
		}

		for (const filePath of filePaths) {
			if (!filePath) {
				console.warn('Encountered an undefined file path:', filePath);
				continue;
			}
			try {
				const absolutePath = path.resolve(filePath);
				const normalizedPath = pathUtils.normalizePath(path.relative(workspacePath, absolutePath));
				if (!this.files.find(f => f.path === normalizedPath)) {
					this.files.push({ path: normalizedPath, fullPath: absolutePath, disabled: false });
				} else {
					console.info(`File already exists in the list: ${normalizedPath}`);
				}
			} catch (error) {
				console.error(`Error processing file ${filePath}: ${error}`);
				vscode.window.showErrorMessage(`Failed to process file: ${filePath}`);
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
				const newState = element.children.some(child => {
					if (child instanceof FileItem) {
						return child.file && !child.file.disabled;
					} else if (child instanceof FolderItem) {
						// For folders, check if any of their descendants are enabled
						return this.hasEnabledFiles(child);
					}
					return false;
				});

				// Recursively toggle all descendant files
				this.toggleFolderChildren(element, newState);

				this.refresh();
			} else {
				vscode.window.showErrorMessage('Unable to toggle folder: No children found.');
			}
		} else {
			vscode.window.showErrorMessage('Unable to toggle element: Unrecognized element type.');
		}
	}

	/**
	 * Recursively checks if a folder or any of its subfolders have enabled files.
	 * @param {FolderItem} folder 
	 * @returns {boolean}
	 */
	hasEnabledFiles(folder) {
		for (const child of folder.children) {
			if (child instanceof FileItem) {
				if (child.file && !child.file.disabled) {
					return true;
				}
			} else if (child instanceof FolderItem) {
				if (this.hasEnabledFiles(child)) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Recursively toggles all descendant files of a folder.
	 * @param {FolderItem} folder 
	 * @param {boolean} newState 
	 */
	toggleFolderChildren(folder, newState) {
		for (const child of folder.children) {
			if (child instanceof FileItem) {
				if (child.file) {
					child.file.disabled = newState;
				}
			} else if (child instanceof FolderItem) {
				this.toggleFolderChildren(child, newState);
			}
		}
	}

	/**
	 * Removes a file from the list based on its path.
	 * @param {string} filePath 
	 */
	removeFile(filePath) {
		const index = this.files.findIndex(f => f.path === filePath);
		if (index !== -1) {
			this.files.splice(index, 1);
			this.refresh();
			vscode.window.showInformationMessage(`File removed: ${filePath}`);
		} else {
			vscode.window.showErrorMessage(`File not found: ${filePath}`);
		}
	}
}

module.exports = FileListProvider;