const vscode = require('vscode');
const path = require('path');
const { extractFilePathFromContent, normalizePath } = require('../utils/pathUtils');

/**
 * Handles the "Paste Code" command.
 *
 * @function
 * @param {Object} fileListProvider - The file list provider instance.
 * @returns {vscode.Disposable} - The disposable command.
 */
function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.pasteCode', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder to paste the code.');
			return;
		}

		const workspaceUri = workspaceFolders[0].uri;

		// Create and show a new Webview panel
		const panel = vscode.window.createWebviewPanel(
			'pasteCode', // Identifies the type of the webview. Used internally
			'Paste Code', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in
			{
				enableScripts: true // Enable scripts in the webview
			}
		);

		// Set the Webview's HTML content
		panel.webview.html = getWebviewContent();

		// Handle messages from the Webview
		panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'writeCodeToFile':
						const codeContentRaw = message.code.trim();

						if (!codeContentRaw) {
							vscode.window.showErrorMessage('Code content cannot be empty.');
							return;
						}

						// Extract the file path from the code content
						const extractedFilePath = extractFilePathFromContent(codeContentRaw);

						if (!extractedFilePath) {
							vscode.window.showErrorMessage('Failed to extract file path from the code content. Please ensure the first line contains the file path in the correct format.');
							return;
						}

						// Remove the file path line from the code content
						const codeContent = removeFilePathLine(codeContentRaw);

						let filePath = normalizePath(extractedFilePath);

						// Resolve the absolute file path
						const absolutePath = path.isAbsolute(filePath)
							? filePath
							: path.join(workspaceUri.fsPath, filePath);

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

							if (!fileExists) {
								// Add the new file to the file list
								await fileListProvider.addFiles([fileUri.fsPath]);
							}

							// Inform the user of success
							vscode.window.showInformationMessage(`Code pasted successfully to ${filePath}!`);
						} catch (error) {
							console.error(`Error writing file ${filePath}: ${error}`);
							vscode.window.showErrorMessage(`Failed to write file: ${filePath}`);
						}
						return;
				}
			},
			undefined,
			[]
		);

		/**
		 * Returns the HTML content for the Webview.
		 * @returns {string} The HTML content.
		 */
		function getWebviewContent() {
			return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <!-- Updated CSP to allow inline scripts -->
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' vscode-resource:;">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Paste Code</title>
                    <style>
                        body {
                            font-family: sans-serif;
                            padding: 10px;
                        }
                        textarea {
                            width: 100%;
                            height: 300px;
                            resize: vertical;
                            margin-bottom: 10px;
                        }
                        button {
                            padding: 10px 20px;
                            font-size: 16px;
                        }
                    </style>
                </head>
                <body>
                    <h2>Paste Your Code</h2>
                    <label for="codeContent">Code:</label>
                    <textarea id="codeContent" placeholder="Paste your code here, including the file path in the first line..."></textarea>
                    <button onclick="writeToFile()">Write to File</button>

                    <script>
                        const vscode = acquireVsCodeApi();

                        function writeToFile() {
                            const codeContent = document.getElementById('codeContent').value;

                            vscode.postMessage({
                                command: 'writeCodeToFile',
                                code: codeContent
                            });
                        }
                    </script>
                </body>
                </html>
            `;
		}

		/**
		 * Removes the first line that contains the file path from the code content.
		 * @param {string} content - The raw code content.
		 * @returns {string} - The code content without the file path line.
		 */
		function removeFilePathLine(content) {
			const lines = content.split('\n');
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();

				if (line === '') {
					continue;
				}

				// Check for patterns (case-insensitive)
				const regexes = [
					/^\/\/\s*(.*)$/i,            // Matches // path/to/file
					/^---\s*(.*)\s*---$/i        // Matches --- path/to/file ---
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
	});
}

module.exports = {
	registerCommand
};
