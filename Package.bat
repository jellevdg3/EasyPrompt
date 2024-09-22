@echo off
REM Exit immediately if a command fails

REM Increment the patch version in package.json without creating a git tag
npm version patch --no-git-tag-version

REM Package the extension using vsce
vsce package
