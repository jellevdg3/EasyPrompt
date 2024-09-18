const vscode = require('vscode');
const path = require('path');
const { extractFilePathFromContent, normalizePath } = require('../utils/pathUtils');

class PasteCodeViewProvider {
	/**
	 * 
	 * @param {vscode.ExtensionContext} context 
	 */
	constructor(context) {
		this.context = context;
		this.view = null;
	}

	/**
	 * Registers the webview view provider.
	 */
	register() {
		vscode.window.registerWebviewViewProvider('pasteCodeView', this, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		});
	}

	/**
	 * Called by VS Code to resolve the webview view.
	 * @param {vscode.WebviewView} webviewView 
	 * @param {vscode.WebviewViewResolveContext} context 
	 * @param {vscode.CancellationToken} token 
	 */
	resolveWebviewView(webviewView, context, token) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			// Restrict the webview to only load resources from your extension's `resources` directory.
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
		};

		webviewView.webview.html = this.getHtmlForWebview();

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'writeCodeToFile':
						await this.writeCodeToFile(message.filePath, message.code);
						break;
					case 'extractFilePath':
						await this.extractAndPopulateFilePath(message.code);
						break;
				}
			},
			undefined,
			this.context.subscriptions
		);
	}

	/**
	 * Returns the HTML content for the webview.
	 * @returns {string}
	 */
	getHtmlForWebview() {
		return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Paste Code</title>
                <style>
                    body {
                        font-family: sans-serif;
                        padding: 20px;
                        background-color: #1e1e1e; /* Dark background for the webview */
                        color: #ffffff; /* Default text color */
                    }
                    h2 {
                        color: #ffffff;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: bold;
                    }
                    input[type="text"] {
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 15px;
                        background-color: #2d2d2d; /* Medium gray background */
                        color: #ffffff; /* White text */
                        border: 1px solid #444444;
                        border-radius: 4px;
                        font-size: 14px;
                        box-sizing: border-box;
                        outline: none;
                        transition: border-color 0.3s ease, box-shadow 0.3s ease;
                    }
                    input[type="text"].error {
                        border-color: #ff4d4d;
                        box-shadow: 0 0 5px #ff4d4d;
                    }
                    textarea {
                        width: 100%;
                        height: 200px;
                        resize: vertical;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #2d2d2d; /* Medium gray background */
                        color: #ffffff; /* White text */
                        border: 1px solid #444444;
                        border-radius: 4px;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 14px;
                        box-sizing: border-box;
                        outline: none;
                        transition: border-color 0.3s ease, box-shadow 0.3s ease;
                    }
                    textarea::placeholder {
                        color: #aaaaaa;
                    }
                    textarea.error {
                        border-color: #ff4d4d;
                        box-shadow: 0 0 5px #ff4d4d;
                    }
                    button {
                        padding: 10px 20px;
                        font-size: 16px;
                        background-color: #4d4d4d; /* Flat light gray */
                        color: #ffffff; /* White text */
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background-color 0.3s ease;
                    }
                    button:hover {
                        background-color: #666666; /* Slightly darker on hover */
                    }
                    button:active {
                        background-color: #555555; /* Even darker when clicked */
                    }
                    .error-message {
                        color: #ff4d4d;
                        margin-bottom: 10px;
                        display: none;
                    }
                    .error-message.visible {
                        display: block;
                    }
                    @keyframes shake {
                        0% { transform: translateX(0); }
                        25% { transform: translateX(-5px); }
                        50% { transform: translateX(5px); }
                        75% { transform: translateX(-5px); }
                        100% { transform: translateX(0); }
                    }
                    .shake {
                        animation: shake 0.5s;
                    }
                </style>
            </head>
            <body>
                <h2>Paste Your Code</h2>
                
                <div class="error-message" id="errorMessage">File path cannot be empty.</div>

                <label for="filePath">File Path:</label>
                <input type="text" id="filePath" placeholder="e.g., src/components/MyComponent.js">

                <label for="codeContent">Code:</label>
                <textarea id="codeContent" placeholder="Paste your code here, including the file path in the first line..."></textarea>
                <button onclick="writeToFile()">Write to File</button>

                <script>
                    const vscode = acquireVsCodeApi();

                    const filePathInput = document.getElementById('filePath');
                    const codeContentTextarea = document.getElementById('codeContent');
                    const errorMessage = document.getElementById('errorMessage');

                    /**
                     * Writes the code to the specified file.
                     */
                    function writeToFile() {
                        const filePath = filePathInput.value.trim();
                        const codeContent = codeContentTextarea.value;

                        // Reset error states
                        resetErrors();

                        if (!filePath) {
                            showError('filePath');
                            showErrorMessage('File path cannot be empty.');
                            return;
                        }

                        vscode.postMessage({
                            command: 'writeCodeToFile',
                            filePath: filePath,
                            code: codeContent
                        });
                    }

                    /**
                     * Extracts the file path from the pasted code and populates the filePath input.
                     * Also removes the file path line from the code content.
                     */
                    codeContentTextarea.addEventListener('input', () => {
                        const codeContent = codeContentTextarea.value;
                        vscode.postMessage({
                            command: 'extractFilePath',
                            code: codeContent
                        });
                    });

                    /**
                     * Receives messages from the extension backend.
                     */
                    window.addEventListener('message', event => {
                        const message = event.data;

                        switch (message.command) {
                            case 'populateFilePath':
                                filePathInput.value = message.filePath || '';
                                if (message.filePath) {
                                    // Remove the file path line from the code content
                                    codeContentTextarea.value = message.cleanedCode || '';
                                }
                                break;
                            case 'showError':
                                showError(message.field);
                                showErrorMessage(message.message);
                                break;
                            case 'clearFields':
                                filePathInput.value = '';
                                codeContentTextarea.value = '';
                                break;
                        }
                    });

                    /**
                     * Displays an error state on the specified field.
                     * @param {string} field 
                     */
                    function showError(field) {
                        if (field === 'filePath') {
                            filePathInput.classList.add('error', 'shake');
                            setTimeout(() => {
                                filePathInput.classList.remove('shake');
                            }, 500);
                        }
                    }

                    /**
                     * Resets all error states.
                     */
                    function resetErrors() {
                        filePathInput.classList.remove('error');
                        codeContentTextarea.classList.remove('error');
                        errorMessage.classList.remove('visible');
                    }

                    /**
                     * Shows an error message.
                     * @param {string} message 
                     */
                    function showErrorMessage(message) {
                        errorMessage.textContent = message;
                        errorMessage.classList.add('visible');
                    }
                </script>
            </body>
            </html>
        `;
	}

	/**
	 * Handles writing the pasted code to a file.
	 * @param {string} filePathRaw 
	 * @param {string} codeContentRaw 
	 */
	async writeCodeToFile(filePathRaw, codeContentRaw) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
			return;
		}

		const workspaceUri = workspaceFolders[0].uri;

		const filePath = filePathRaw.trim();
		let codeContent = codeContentRaw.trim();

		if (!filePath) {
			// Inform the webview to show error
			this.view.webview.postMessage({
				command: 'showError',
				field: 'filePath',
				message: 'File path cannot be empty.'
			});
			return;
		}

		if (!codeContent) {
			vscode.window.showErrorMessage('Code content cannot be empty.');
			return;
		}

		// Extract the file path from the code content if present
		const extractedFilePath = extractFilePathFromContent(codeContent);
		if (extractedFilePath) {
			// Remove the file path line from the code content
			codeContent = this.removeFilePathLine(codeContent);
			// Optionally, you can choose to prefer the input filePath over the extracted one
			// For now, we'll use the input filePath
		}

		let filePathToUse = filePath;

		// Normalize the file path
		filePathToUse = normalizePath(filePathToUse);

		// Resolve the absolute file path
		const absolutePath = path.isAbsolute(filePathToUse)
			? filePathToUse
			: path.join(workspaceUri.fsPath, filePathToUse);

		const fileUri = vscode.Uri.file(absolutePath);

		// Prepare the content to write
		const encoder = new TextEncoder();
		const contentBytes = encoder.encode(codeContent);

		try {
			// Check if file exists
			let fileExists = false;
			try {
				await vscode.workspace.fs.stat(fileUri);
				fileExists = true;
			} catch (error) {
				// File does not exist
			}

			// Create parent directories if necessary
			const parentUri = vscode.Uri.file(path.dirname(absolutePath));
			await vscode.workspace.fs.createDirectory(parentUri);

			// Write the content to the file
			await vscode.workspace.fs.writeFile(fileUri, contentBytes);

			// Inform the user of success
			vscode.window.showInformationMessage(`Code pasted successfully to ${filePathToUse}!`);

			// Clear the fields in the webview
			this.view.webview.postMessage({
				command: 'clearFields'
			});

			// **New Code Starts Here**

			// Open the newly created file in the editor
			const document = await vscode.workspace.openTextDocument(fileUri);
			const editor = await vscode.window.showTextDocument(document);

			// Wait for the editor to be ready
			await new Promise(resolve => setTimeout(resolve, 100));

			// Execute the format command on the active editor
			await vscode.commands.executeCommand('editor.action.formatDocument');

			// Save the formatted document
			await document.save();

			// **New Code Ends Here**

		} catch (error) {
			console.error(`Error writing file ${filePathToUse}: ${error}`);
			vscode.window.showErrorMessage(`Failed to write file: ${filePathToUse}`);
		}
	}

	/**
	 * Extracts the file path from the pasted code and sends it back to the webview.
	 * @param {string} codeContentRaw 
	 */
	async extractAndPopulateFilePath(codeContentRaw) {
		const codeContent = codeContentRaw.trim();

		if (!codeContent) {
			return;
		}

		// Extract the file path from the code content
		const extractedFilePath = extractFilePathFromContent(codeContent);

		if (extractedFilePath) {
			// Remove the file path line from the code content
			const cleanedCodeContent = this.removeFilePathLine(codeContent);

			// Send the extracted file path and cleaned code back to the webview
			this.view.webview.postMessage({
				command: 'populateFilePath',
				filePath: extractedFilePath,
				cleanedCode: cleanedCodeContent
			});
		}
	}

	/**
	 * Removes the first line that contains the file path from the code content.
	 * @param {string} content 
	 * @returns {string}
	 */
	removeFilePathLine(content) {
		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			if (line === '') {
				continue;
			}

			// Check for patterns (case-insensitive)
			const regexes = [
				/^\/\/\s*(.+)$/i,            // Matches // path/to/file
				/^---\s*(.+)\s*---$/i        // Matches --- path/to/file ---
			];

			for (const regex of regexes) {
				const match = line.match(regex);
				if (match) {
					// Remove this line
					lines.splice(i, 1);
					return lines.join('\n').trim();
				}
			}

			// If no match in the first non-empty line, break
			break;
		}

		// If no file path line found, return the original content
		return content;
	}
}

module.exports = PasteCodeViewProvider;