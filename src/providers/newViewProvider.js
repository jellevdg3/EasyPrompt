const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;

class NewViewProvider {
	constructor(context) {
		this.context = context;
	}

	async resolveWebviewView(webviewView, context, token) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
		};

		const htmlPath = path.join(this.context.extensionPath, 'resources', 'newView.html');
		let html = await fs.readFile(htmlPath, 'utf8');
		webviewView.webview.html = html;
	}
}

module.exports = NewViewProvider;