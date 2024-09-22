#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Increment the patch version in package.json without creating a git tag
npm version patch --no-git-tag-version

# Package the extension using vsce
vsce package
