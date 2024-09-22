@echo off
npm version patch --no-git-tag-version && vsce package
