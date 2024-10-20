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

		const htmlPath = path.join(this.context.extensionPath, 'resources', 'EastGPT', 'dist', 'index.html');
		try {
			let html = await fs.readFile(htmlPath, 'utf8');

			const assetsPath = path.join(this.context.extensionPath, 'resources', 'EastGPT', 'dist', 'assets');
			const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.file(path.join(assetsPath, 'index-DOFSOcTv.js')));
			const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.file(path.join(assetsPath, 'index-CQfFT7tr.css')));

			html = html.replace('/assets/index-DOFSOcTv.js', scriptUri.toString());
			html = html.replace('/assets/index-CQfFT7tr.css', styleUri.toString());

			// Inject error handling and logging script
			const errorHandlingScript = `
				<script>
					const vscode = acquireVsCodeApi();
					window.addEventListener('load', () => {
						console.log('Main script loaded successfully');
						vscode.postMessage({ type: 'info', message: 'Webview page loaded' });
					});
					window.onerror = function(message, source, lineno, colno, error) {
						vscode.postMessage({
							type: 'error',
							message: message,
							source: source,
							lineno: lineno,
							colno: colno,
							error: error ? error.stack : null
						});
					};
					window.addEventListener('unhandledrejection', function(event) {
						vscode.postMessage({
							type: 'error',
							message: event.reason ? event.reason.message : 'Unhandled rejection',
							error: event.reason ? event.reason.stack : null
						});
					});
				</script>
			</body>`;
			html = html.replace('</body>', errorHandlingScript);

			webviewView.webview.html = html;
			console.log('Webview HTML set');

			webviewView.webview.onDidReceiveMessage(message => {
				if (message.type === 'error') {
					const { message: msg, source, lineno, colno, error } = message;
					console.error(`Webview Error: ${msg} at ${source}:${lineno}:${colno}\n${error}`);
					vscode.window.showErrorMessage(`Webview Error: ${msg}`);
				} else if (message.type === 'info') {
					console.log(`Webview Info: ${message.message}`);
				}
			});
		} catch (error) {
			console.error(`Failed to load index.html: ${error.message}`);
			vscode.window.showErrorMessage(`Failed to load view: ${error.message}`);
		}
	}
}

module.exports = NewViewProvider;