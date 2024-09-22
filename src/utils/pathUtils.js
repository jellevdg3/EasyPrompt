const path = require('path');

const FILE_PATH_REGEXES = [
	/^\/\/\s*(.+)$/i,
	/^#\s*(.+)$/i,
	/^<!--\s*(.+)\s*-->/i,
	/^\/\*\s*(.+)\s*\*\/$/i,
	/^;\s*(.+)$/i,
	/^%\s*(.+)$/i,
	/^---\s*(.+)\s*---$/i
];

function normalizePath(p) {
	return p.split(path.sep).join('/');
}

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

		break;
	}

	return null;
}

module.exports = {
	normalizePath,
	extractFilePathFromContent,
	FILE_PATH_REGEXES
};