# Contributing to Cheerleader

Thanks for your interest in contributing to Cheerleader! We aim to make VSCode development more fun and engaging with our anime coding companion.

## Before You Start

- Please **open an issue first** before submitting any pull requests (if the issue is not already opened by us or other contributors)
- This helps us discuss the changes you want to make and ensures your time is well spent

## How to Contribute

1. Fork the repository
2. Create a new branch for your feature/fix
3. Make your changes
4. Test your changes thoroughly
5. Submit a pull request

## Development Setup

Make sure you have:
- VS Code
- VSCode Extension CLI (install globally with `npm install -g @vscode/vsce`)
- Node.js
- npm
- Electron.js (install globally with `npm install -g electron`)

Follow the installation steps in the README for setting up the development environment.

## Testing

Make sure you test your changes before submitting a pull request. We are still in the process of adding automated unit tests, so manual testing is currently required. Testing with either of the following methods is recommended:

1. Test using the VSCode Run and Debug feature (make sure you have the correct launch configuration). It will bundle the extension and open a new instance of VSCode with the Cheerleader extension loaded.

2. Build the extension with `vsce package` and install the generated `.vsix` file in your local VSCode instance. You can do this by going to the Extensions view, clicking on the three-dot menu, and selecting "Install from VSIX...".

## Pull Request Process

1. Open an issue describing what you want to do
2. Fork and clone the repository
3. Create your feature branch (`git checkout -b feature/AmazingFeature`)
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to your branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## Need Help?

Have questions? Feel free to open an issue for discussion.

## Code of Conduct

Please keep interactions respectful and professional. Help us maintain a welcoming environment for everyone.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.