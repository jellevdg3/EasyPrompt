const vscode = require('vscode');

class NewViewSerializer {
	constructor(newViewManager) {
		this.newViewManager = newViewManager;
	}

	async deserializeWebviewPanel(webviewPanel, state) {
		console.log(`Restoring panel with state: ${JSON.stringify(state)}`);
		try {
			await this.newViewManager.restorePanel(webviewPanel, state);
		} catch (error) {
			console.error(`Error deserializing webview panel: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to load view: ${error.message}`);
		}
	}

	serializeWebviewPanel(webviewPanel) {
		const state = webviewPanel.webview.state;
		return state;
	}
}

module.exports = NewViewSerializer;