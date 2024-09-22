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

const FORMAT4_REGEX = /---\s*\n\*\*(.+?)\*\*\s*\n```(\w+)?\s*\n([\s\S]*?)```/g;

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

		const filePath = extractFilePathFromContent(code);
		if (filePath) {
			code = removeFilePathLine(code);
			result.push({ filePath, language, code });
		} else {
		}
	}

	return result;
}

function extractFilesAndCodeFormat3(message) {
	const result = [];
	const regex = /---\s*([^\s]+)\s*---\s*```(\w+)?\s*([\s\S]*?)```/g;
	let match;

	while ((match = regex.exec(message)) !== null) {
		const filePath = match[1].trim();
		const language = match[2] ? match[2].trim() : '';
		const code = match[3].trim();

		if (filePath && code) {
			const codeWithPath = "// " + filePath + "\n" + code;
			result.push({ filePath, language, code: codeWithPath });
		} else {
		}
	}

	return result;
}

function extractFilesAndCodeFormat4(message) {
	const result = [];
	let match;

	while ((match = FORMAT4_REGEX.exec(message)) !== null) {
		const filePath = match[1].trim();
		const language = match[2] ? match[2].trim() : '';
		const code = match[3].trim();

		if (filePath && code) {
			result.push({ filePath, language, code });
		} else {
		}
	}

	return result;
}

function extractPathsAndCodeFromContent(content) {
	let result = extractFilesAndCodeFormat4(content);
	if (result.length > 0) {
		return result;
	}

	result = extractFilesAndCodeFormat3(content);
	if (result.length > 0) {
		return result;
	}

	result = extractFilesAndCodeFormat2(content);
	if (result.length > 0) {
		return result;
	}

	result = extractFilesAndCodeFormat1(content);
	if (result.length > 0) {
		return result;
	}

	const filePath = extractFilePathFromContent(content);
	const code = content;

	return [{ filePath, language: '', code }];
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
