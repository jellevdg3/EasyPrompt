// src/utils/pathUtils.js
const path = require('path');

/**
 * @class PathUtils
 * Utility functions for path operations.
 */

/**
 * Normalizes a file path to use forward slashes.
 * @param {string} p 
 * @returns {string}
 */
function normalizePath(p) {
	return p.split(path.sep).join('/');
}

module.exports = {
	normalizePath
};
