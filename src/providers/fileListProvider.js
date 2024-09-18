// src/providers/fileListProvider.js
const vscode = require('vscode');
const path = require('path');
const { PlaceholderTreeItem } = require('../models/placeholderTreeItem');
const { FolderItem } = require('../models/folderItem');
const { FileItem } = require('../models/fileItem');
const pathUtils = require('../utils/pathUtils');

/**
 * @class FileListProvider
 * Provides the data for the file list tree view.
 */
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
				const relativePath = path.relative(basePath, filePath);
				const normalizedPath = pathUtils.normalizePath(relativePath);
				if (!this.files.find(f => f.path === normalizedPath)) {
					this.files.push({ path: normalizedPath, disabled: false });
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
}

module.exports = FileListProvider;
