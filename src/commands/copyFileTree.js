const vscode = require('vscode');

function registerCommand(fileListProvider) {
	return vscode.commands.registerCommand('fileListManager.copyFileTree', async () => {
		const files = fileListProvider.files;
		const tree = buildTree(files);
		const treeText = formatTree(tree);
		await vscode.env.clipboard.writeText(treeText);
		vscode.window.showInformationMessage('File tree copied to clipboard.');
	});
}

function buildTree(files) {
	const root = {};
	files.forEach(file => {
		const parts = file.path.split('/');
		let current = root;
		parts.forEach(part => {
			if (!current[part]) {
				current[part] = {};
			}
			current = current[part];
		});
	});
	return root;
}

function formatTree(tree, indent = '') {
	let text = '';
	const keys = Object.keys(tree).sort();
	keys.forEach(key => {
		text += indent + key + '\n';
		text += formatTree(tree[key], indent + '  ');
	});
	return text;
}

module.exports = {
	registerCommand
};