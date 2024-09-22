const vscode = require('vscode');

const DragAndDropController = {
	async handleDrag(fileListProvider, sourceElements, dataTransfer, token) {
		if (!Array.isArray(sourceElements)) {
			return [];
		}
		return sourceElements.map(el => el.file && el.file.path ? el.file.path : null).filter(path => path !== null);
	},

	async handleDrop(fileListProvider, targetElement, dataTransfer, token) {
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
					return null;
				}
			}).filter(path => path !== null);

			if (filePaths.length > 0) {
				await fileListProvider.addFiles(filePaths);
			}

			const internalData = await dataTransfer.get('application/vnd.code.tree.fileListView');
			if (internalData) {
			}

		} catch (error) {
			vscode.window.showErrorMessage(`Failed to handle drop: ${error}`);
		}

		fileListProvider.refresh();
	}
};

module.exports = DragAndDropController;