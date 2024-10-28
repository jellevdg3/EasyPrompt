const vscode = require('vscode');

class NewViewSerializer {
    constructor(newViewManager) {
        this.newViewManager = newViewManager;
    }

    async deserializeWebviewPanel(panel, state) {
        await this.newViewManager.restorePanel(panel, state);
    }

    serializeWebviewPanel(panel) {
        return this.newViewManager.getSerializedState(panel);
    }
}

module.exports = NewViewSerializer;