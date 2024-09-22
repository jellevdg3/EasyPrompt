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

function extractFilesAndCodeFormat1(message) {
	const result = [];
	const regex = /###\s+(.+?)\s+```([\w+#\-]+)\s*([\s\S]*?)```/g
	let match;
	while ((match = regex.exec(message)) !== null) {
		const filePath = match[1].replace(/---/g, '').replace(/`/g, '').trim();
		const language = match[2].trim();
		const code = match[3].trim();

		if (filePath && language && code) {
			result.push({ filePath, language, code });
		} else {
			console.warn('Incomplete section found:', match[0]);
		}
	}

	return result;
}

function extractFilesAndCodeFormat2(message) {
	const result = [];
	const codeBlockRegex = /```([\w+#\-]+)\s*([\s\S]+?)```/g;
	let match;

	while ((match = codeBlockRegex.exec(message)) !== null) {
		const language = match[1].trim();
		let code = match[2].trim();

		// Extract file path from the first line of the code
		const filePath = extractFilePathFromContent(code);
		if (filePath) {
			// Remove the file path comment line from the code
			code = removeFilePathLine(code);
			result.push({ filePath, language, code });
		} else {
			console.warn('No file path found for this code block:', code);
		}
	}

	return result;
}

function extractPathsAndCodeFromContent(content) {
	let result = extractFilesAndCodeFormat1(content);
	if (result.length > 0) {
		return result;
	}
	result = extractFilesAndCodeFormat2(content);
	if (result.length > 0) {
		return result;
	}
	const path = extractFilePathFromContent(content);
	const code = content;
	return [{ filePath: path, language: '', code }];
}

function removeFilePathLine(content) {
	const lines = content.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '') {
			continue;
		}

		for (const regex of FILE_PATH_REGEXES) {
			const match = line.match(regex);
			if (match) {
				lines.splice(i, 1);
				return lines.join('\n').trim();
			}
		}

		break;
	}

	return content;
}

module.exports = {
	normalizePath,
	extractFilePathFromContent,
	removeFilePathLine,
	extractPathsAndCodeFromContent
};
