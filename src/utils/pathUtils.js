const path = require('path');

/**
 * @filePath src/utils/pathUtils.js
 * Utility functions for path manipulation.
 */

// Define regex patterns
const FILE_PATH_REGEXES = [
	/^\/\/\s*(.+)$/i,                   // Matches // path/to/file
	/^#\s*(.+)$/i,                      // Matches # path/to/file (Python, Shell, etc.)
	/^<!--\s*(.+)\s*-->/i,              // Matches <!-- path/to/file -->
	/^\/\*\s*(.+)\s*\*\/$/i,            // Matches /* path/to/file */
	/^;\s*(.+)$/i,                      // Matches ; path/to/file (Lisp/Scheme)
	/^%\s*(.+)$/i,                      // Matches % path/to/file (MATLAB, Prolog)
	/^---\s*(.+)\s*---$/i                // Matches --- path/to/file ---
];

/**
 * Normalizes a file path to use forward slashes.
 * @param {string} p 
 * @returns {string}
 */
function normalizePath(p) {
	return p.split(path.sep).join('/');
}

/**
 * Extracts the file path from the first line(s) of the content.
 * @param {string} content
 * @returns {string|null} The extracted file path or null if not found.
 */
function extractFilePathFromContent(content) {
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line === '') {
			continue;
		}

		for (const regex of FILE_PATH_REGEXES) {
			const match = line.match(regex);
			if (match) {
				const filePath = match[1].trim();
				return filePath;
			}
		}

		// If no match in the first non-empty line, break
		break;
	}

	return null;
}

module.exports = {
	normalizePath,
	extractFilePathFromContent,
	FILE_PATH_REGEXES // Exporting for reuse
};