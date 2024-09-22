const vscode = require('vscode');
const path = require('path');
const { extractFilesAndCode, processFileContent, readFileContent } = require('./promptUtils');
const { prepareFile } = require('./fileUtils');

class CodePrepUtils {
	/**
	 * Prepares the code to be written to files.
	 * @param {string} rawContent - The raw content to prepare.
	 * @param {object} context - The extension context.
	 * @returns {Promise<{ files: Array, preparedData: any }>}
	 */
	async prep(rawContent, context) {
		const extractedFiles = extractFilesAndCode(rawContent);
		if (extractedFiles.length > 0) {
			const processedFiles = [];
			for (const file of extractedFiles) {
				try {
					const fileContent = await readFileContent(file.filePath);
					const processedContent = processFileContent(fileContent, file.filePath);
					processedFiles.push({
						filePath: file.filePath,
						content: processedContent
					});
				} catch (error) {
					console.error(`Error processing file ${file.filePath}: ${error}`);
					vscode.window.showErrorMessage(`Failed to process file: ${file.filePath}`);
				}
			}
			return { files: processedFiles, preparedData: null };
		} else {
			const preparedData = prepareFile(rawContent, context);
			return { files: [], preparedData };
		}
	}

	/**
	 * Extracts files and code from the raw content.
	 * @param {string} message - The raw message content.
	 * @returns {Array} - Array of extracted files with filePath, language, and code.
	 */
	extractFilesAndCode(message) {
		return extractFilesAndCode(message);
	}
}

module.exports = new CodePrepUtils();