const path = require('path');

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
 * It looks for lines like:
 * // src/commands/copyPrompt.js
 * --- src/commands/copyPrompt.js ---
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

		// Check for patterns (case-insensitive)
		const regexes = [
			/^\/\/\s*(.+)$/i,            // Matches // path/to/file
			/^---\s*(.+)\s*---$/i        // Matches --- path/to/file ---
		];

		for (const regex of regexes) {
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
	extractFilePathFromContent
};
