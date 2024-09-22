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

function extractFilesAndCode(message) {
	const result = [];
	const regex = /###\s+(.+?)\s+```([\w+#\-]+)\s*([\s\S]*?)```/g
	let match;
	while ((match = regex.exec(message)) !== null) {
		const filePath = match[1].trim().replace(/`/g, '');
		const language = match[2].trim();
		const code = match[3].trim();

		console.log('filePath: ', filePath);
		console.log('language: ', language);
		console.log('code: ', code);

		if (filePath && language && code) {
			result.push({ filePath, language, code });
		} else {
			console.warn('Incomplete section found:', match[0]);
		}
	}

	return result;
}

function extractPathsAndCodeFromContent(content) {
	const result = extractFilesAndCode(content);
	if (result.length === 0) {
		const path = extractFilePathFromContent(content);
		const code = content;
		return [{ filePath: path, language: '', code }];
	}
	return result;
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
