# Cheerleader

<p align="center">
  <img src="assets/cheerleader.svg" alt="Cheerleader" width="50">
  Supercharge your dev experience with an anime coding companion!
</p>

## Features

Cheerleader brings a fun, interactive anime assistant to your VS Code environment that helps you stay motivated, productive, and engaged while coding:

<p align="center">
   <img src="assets/screenshots/demo.png" alt="Coding with Cheerleader" width="600">
   <br>
   <em>Coding with your anime companion</em>
</p>

### Interactive Anime Companion
- An interactive anime character that floats on your screen and provides encouragement
- Choose from multiple character models to be your coding companion
- Position your cheerleader anywhere on your screen
- Interact with your cheerleader with the mouse or action buttons

### Code Support & AI Assistance
- Ask questions about your code using text or voice
- Receive constructive comments, explanations, and suggested edits for your code

### Encouragement and Motivation
- Get encouraging messages based on your coding activity
- Hear cheerful feedback when you complete tasks like builds or tests
- Get recognized for consistent coding sessions

### Productivity Features
- Monitor your productivity and get gentle reminders when you stray
- Toggle background lofi music to help you focus
- Get motivated when you've been inactive for too long

## Usage

### Character Interaction
- Click and drag the character to reposition it
- Use the buttons around the character to access features:
  - Chat button: Start an inline chat
  - Code review button: Review your current file
  - Music button: Toggle lofi background music

### Voice Commands
1. Click on the microphone button or use the `cheerleader.startVoiceInteraction` command
2. Speak your question or request
3. Click "Stop" when you're done speaking
4. Your cheerleader will process your speech and respond both visually and with audio

### Code Review
1. Open a file you want to review
2. Run the `cheerleader.reviewCode` command or click the code review button
3. Cheerleader will analyze your code and provide helpful feedback with voice explanations

### Inline Chat
1. Open a file you want to discuss
2. Run `cheerleader.inlineChat` , `cheerleader.inlineChatVoice`, or use the inline chat button
3. Ask questions about your code
4. Receive conversational responses, code comments, or detailed explanations

### Settings
- Access the cheerleader controls from the sidebar
- Configure API keys for text-to-speech and speech-to-text processes
- Switch between different cheerleader characters
- Toggle encouragement features on/off
- Toggle productivity tracking on/off

## Installation

We will be available on the VSCode Extensions Marketplace soon. For now, you can install from source with the steps below.

`node.js` and `npm` are required for installing from source. You can install them from npm's [official website](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

1. Clone the repo:

   ```sh
   git clone https://github.com/endernoke/vscode-cheerleader
   ```

2. Install `electron.js`, which is required for rendering the interactive cheerleader. We recommend installing globally so you don't need to install it individually for every workspace.

   ```sh
   npm install -g electron
   ```

3. Install project dependencies:

   ```sh
   npm install
   ```

4. Install the VScode extension CLI

   ```sh
   npm install -g @vscode/vsce
   ```

5. In the project directory, run the following command to generate a `.vsix` file:

   ```sh
   cd path/to/vscode-cheerleader
   vsce package
   ```

6. Open VSCode and go to the extensions tab. Under more options, select "Install from VSIX" and select the `.vsix` file you just built to install it.

## Extension Settings

Extension settings can be configured in the activity sidebar under the cheerleader icon.

## Commands

- `cheerleader.inlineChat`: Open a text-based inline chat for the current file
- `cheerleader.inlineChatVoice`: Start a voice-based inline chat for the current file
- `cheerleader.reviewCode`: Run a code review on the current file
- `cheerleader.startVoiceInteraction`: Start a voice interaction with the cheerleader
- `cheerleader.startRecording`: Start recording audio
- `cheerleader.stopRecording`: Stop recording audio
- `cheerleader.testTTS`: Test text-to-speech functionality
- `cheerleader.toggleEncouragement`: Toggle encouragement features on/off
- `cheerleader.toggleMonitoringRotting`: Toggle productivity monitoring
- `cheerleader.testEncouragement`: Test encouragement messages

## Requirements

- VS Code
- Node.js
- Electron.js
- Microphone access (for voice interaction features)

## License

Released under the [MIT License](LICENSE).

The interactive anime cheerleader is built with live2d. Note that none of the live2d models used are owned by the authors of this repository. The copyrights of all Live2D models, images, and motion data belong to their respective original authors (e.g. [HakkoAI](https://www.doudou.fun)). They should not be used for commercial purposes.

Official Live2D websites:  

- https://www.live2d.com/en/  
- https://live2d.github.io

Live2D Cubism Core is provided under the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html). 

Live2D Cubism Components are provided under the [Live2D Open Software License](http://www.live2d.com/eula/live2d-open-software-license-agreement_en.html).

> The terms and conditions do prohibit modification, but obfuscating in `live2d.min.js` would not be considered illegal modification ([source](https://community.live2d.com/discussion/140/webgl-developer-licence-and-javascript-question)).

## Credits

Authors: [James Zheng](https://www.linkedin.com/in/james-zheng-zi), [Jet Chiang](https://www.linkedin.com/in/jet-chiang)

We salute to the authors and contributors of the following awesome repositories/projects:

- [guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [HakkoAI (逗逗游戏伙伴)](https://www.doudou.fun)
