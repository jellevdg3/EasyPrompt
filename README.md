# Easy Prompt

![Easy Prompt Logo](resources/icon_transparent.png)

**Generate GPT prompts from your code with a single click!**

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Managing Files](#managing-files)
  - [Generating Prompts](#generating-prompts)
- [Configuration](#configuration)
- [Commands & Keybindings](#commands--keybindings)
- [Contributing](#contributing)
- [License](#license)

## Introduction

**Easy Prompt** is a Visual Studio Code extension designed to streamline the process of managing a list of files and generating GPT prompts based on their content. Whether you're a developer looking to create prompts from your codebase or a writer assembling information from multiple sources, Easy Prompt provides an intuitive interface to enhance your productivity.

## Features

- **Add Files Easily:** Select multiple files or directories to include in your prompt generation.
- **Drag and Drop Support:** Quickly add files by dragging them into the extension's view.
- **Manage File List:** Toggle the enable/disable state of files, remove unwanted files, or clear the entire list.
- **Generate GPT Prompts:** Create comprehensive prompts based on the content of your active files with a single click.
- **Webview Interface:** Interact with the prompt generator through a user-friendly webview panel.
- **Customizable Configuration:** Adjust settings to fit your workflow and preferences.

## Installation

1. **Via Visual Studio Code Marketplace:**

   - Open VS Code.
   - Go to the Extensions view by clicking on the Extensions icon in the Activity Bar or pressing `Ctrl+Shift+X`.
   - Search for "**Easy Prompt**".
   - Click **Install**.

2. **Manual Installation:**

   - Download the [latest release](https://github.com/jellevdg3/CodePromptGenerator/releases) from GitHub.
   - In VS Code, press `Ctrl+Shift+P` to open the Command Palette.
   - Type `Extensions: Install from VSIX...` and select it.
   - Navigate to the downloaded `.vsix` file and install.

## Usage

### Managing Files

1. **Open the File List:**

   - Click on the **Code Prompt Generator** icon in the Activity Bar.
   - Select the **Files** view to manage your file list.

2. **Add Files:**

   - Click the **Add Files** button in the view's title bar.
   - Select one or multiple files or directories from the dialog.
   - Alternatively, drag and drop files directly into the **Files** view.

3. **Toggle Files:**

   - Click on a file to enable or disable it. Disabled files will be excluded from prompt generation.

4. **Remove Files:**

   - Right-click on a file and select **Remove File** to delete it from the list.

5. **Clear All Files:**

   - Click the **Clear Files** button in the view's title bar to remove all files from the list.

### Generating Prompts

1. **Open the Code Generator:**

   - Click on the **Code Prompt Generator** icon in the Activity Bar.
   - Select the **Code Generator** view.

2. **Generate Prompt:**

   - In the **Code Generator** webview, click the **Generate Prompt** button.
   - The extension will process the active files and generate a GPT prompt.
   - Copy the generated prompt from the webview to your clipboard.

3. **Additional Actions:**

   - **Write Code to File:** Save the generated code directly to a file.
   - **Extract File Paths:** Automatically populate file paths from your code content.
   - **Copy Prompt:** Easily copy the generated prompt for use in other applications.

## Configuration

Easy Prompt offers customizable settings to tailor the extension to your needs.

1. **Access Settings:**

   - Go to `File > Preferences > Settings` or press `Ctrl+,`.
   - Search for "**Code Prompt Generator**".

2. **Available Settings:**

   - `codePromptGenerator.someSetting`: A sample configuration setting for the Code Prompt Generator.

   *(Note: Replace or expand upon sample settings as needed.)*

## Commands & Keybindings

### Available Commands

- **Open Code Prompt Generator Window**
  - **Command:** `fileListManager.openFileList`
  - **Description:** Opens the Code Prompt Generator interface.

- **Add Files**
  - **Command:** `fileListManager.addFiles`
  - **Description:** Adds files to the file list.

- **Clear Files**
  - **Command:** `fileListManager.clearFiles`
  - **Description:** Clears all files from the file list.

- **Toggle Enable/Disable**
  - **Command:** `fileListManager.toggleFile`
  - **Description:** Toggles the enable or disable state of a file.

- **Remove File**
  - **Command:** `fileListManager.removeFile`
  - **Description:** Removes a file from the file list.

### Keybindings

- **Open File List**
  - **Shortcut:** `Ctrl+Alt+F`
  - **When:** `editorTextFocus`
  - **Command:** `fileListManager.openFileList`

*(You can customize keybindings by modifying the `keybindings` section in your VS Code settings.)*

## Contributing

Contributions are welcome! If you'd like to contribute to Easy Prompt, please follow these steps:

1. **Fork the Repository:**

   - Visit the [GitHub repository](https://github.com/jellevdg3/CodePromptGenerator).
   - Click the **Fork** button to create your own copy.

2. **Clone Your Fork:**

   ```bash
   git clone https://github.com/your-username/CodePromptGenerator.git
   ```

3. **Install Dependencies:**

   ```bash
   cd CodePromptGenerator
   npm install
   ```

4. **Make Your Changes:**

   - Implement your features or bug fixes.

5. **Run Tests:**

   ```bash
   npm test
   ```

6. **Commit and Push:**

   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin main
   ```

7. **Create a Pull Request:**

   - Navigate to your fork on GitHub.
   - Click **Compare & pull request**.
   - Provide a clear description of your changes and submit.

## License

This project is licensed under the [MIT License](LICENSE).

---

© 2024 [jellevdg3](https://github.com/jellevdg3). All rights reserved.