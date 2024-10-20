const NewViewManager = require('../controllers/newViewManager');

class NewViewProvider {
	constructor(viewManager) {
		this.viewManager = viewManager;
	}

	resolveWebviewView(webviewView, context, token) {
		this.viewManager.openNewView();
	}
}

module.exports = NewViewProvider;