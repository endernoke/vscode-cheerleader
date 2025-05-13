import { ActionButtonsManager } from './ActionButtons.js';
import { MusicPlayer } from './MusicPlayer.js';
import { Icons } from './icons.js';

const modelUrls = [
  "https://download.doudou.fun/models/Nika/Nika.model3.json",
  "https://download.doudou.fun/models/Neko/Neko.model3.json",
  "https://download.doudou.fun/models/Jiu/Jiu.model3.json",
  "https://download.doudou.fun/models/Phro/Phro.model3.json",
  "https://download.doudou.fun/models/Sam/Sam.model3.json",
  "https://download.doudou.fun/models/Sherley/Sherley.model3.json",
  "https://download.doudou.fun/models/Thorne/Thorne.model3.json",
  "https://download.doudou.fun/models/Sonia/Sonia.model3.json"
];

let modelIndex = 0;

const live2d = PIXI.live2d;
const MotionPriority = live2d.MotionPriority;

const noResetMotions = ['RESET', 'JUMP_BACK'];

const container = document.getElementById("live2d-container");

let app = null;

let model = null;

let speechTimeout;
const speechBubble = document.querySelector('.speech-bubble');

const updateBubblePosition = () => {
  if (!model) return;
  
  // Get model position state
  const isLeftSide = model.position.x <= -110;
  const isRightSide = model.position.x >= window.innerWidth - 90;
  
  // Calculate base position
  const modelCenterX = model.position.x + model.width / 2;
  const modelTopY = model.position.y;
  
  // Adjust bubble position based on model position
  let left = modelCenterX;
  if (isLeftSide) {
    // When model is on left edge, shift bubble right
    left = Math.max(speechBubble.clientWidth / 2 + 10, modelCenterX + 50);
  } else if (isRightSide) {
    // When model is on right edge, shift bubble left
    left = Math.min(window.innerWidth - speechBubble.clientWidth / 2 - 10, modelCenterX - 50);
  }

  // Calculate top position with padding
  const top = Math.max(10, modelTopY - speechBubble.clientHeight);

  // Apply positions
  speechBubble.style.position = 'absolute';
  speechBubble.style.left = `${left}px`;
  speechBubble.style.top = `${top}px`;
  speechBubble.style.transform = 'translateX(-50%)';
};

function showSpeechBubble(text, duration = 3000) {
  clearTimeout(speechTimeout);
  
  speechBubble.textContent = text;
  speechBubble.classList.add('visible');
  
  // Position the bubble above the model  
  updateBubblePosition();
  
  speechTimeout = setTimeout(() => {
    speechBubble.classList.remove('visible');
  }, duration);
}

const loadModel = async (modelUrl, isCustom = false) => {
  if (!modelUrl) {
    console.error('Model URL is not provided');
    return;
  }
  try {
    console.log('Loading model from URL:', modelUrl);
    model = await live2d.Live2DModel.from(modelUrl);
    if (!model) {
      throw new Error('Failed to create Live2DModel');
    }
  } catch (error) {
    console.error('Error loading model:', error);
    throw error;
  }

  app.stage.addChild(model);

  const scaleX = 200 / model.width;
  const scaleY = 200 / model.height;

  // fit the window
  model.scale.set(Math.min(scaleX, scaleY));

  model.y = 0;
  model.x = 0;

  makeDraggable(model);

  model.isSpeaking = false;
  model.currentMotion = null;
  model.handleExecuteMotion = (motionExt, executionPriority = MotionPriority.FORCE) => {
    try {
      model.motion(motionExt, undefined, executionPriority);
      model.currentMotion = motionExt;
    } catch (error) {
      console.log(error);
    }
  };

  model.internalModel.motionManager.on('motionFinish', () => {
    if (!noResetMotions.includes(model.currentMotion)) {
      if (model.position.x <= -110 || model.position.x >= window.innerWidth - 90) {
        model.handleExecuteMotion("SIDE_RESET", MotionPriority.FORCE);
      }
      else {
        model.handleExecuteMotion("RESET", MotionPriority.FORCE);
      }
    }
    if (model.isSpeaking) {
      const position = model.position.x <= -110 ? "LEFT" : 
                  model.position.x >= window.innerWidth - 90 ? "RIGHT" : 
                  "CENTER";
      model.handleExecuteMotion(`${position}_SAYING`, MotionPriority.NORMAL);
    }
  });
  
  model.on("hit", (hitAreas) => {
    if (hitAreas.includes('Head')) {
      model.handleExecuteMotion('TapHead', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('Body')) {
      model.handleExecuteMotion('TapBody', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('leg')) {
      model.handleExecuteMotion('Tapleg', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('leg2')) {
      model.handleExecuteMotion('Tapleg2', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('bra')) {
      model.handleExecuteMotion('Tapbra', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('hl')) {
      model.handleExecuteMotion('Taphl', MotionPriority.NORMAL);
    }
    if (hitAreas.includes('hr')) {
      model.handleExecuteMotion('Taphr', MotionPriority.NORMAL);
    }
  });

  const buttonManager = new ActionButtonsManager(model);

  const createSVGElement = (svgString) => {
    const svg = new DOMParser().parseFromString(svgString, 'text/html').body.firstChild;
    return svg;
  };

  // Example buttons
  buttonManager.addButton({
    onClick: () => {
      window.electronAPI.onCloseButton();
    },
    icon: createSVGElement(Icons.CLOSE),
    tooltip: 'Quit Cheerleader'
  });

  // these custom animatinos are only available on the base models
  // because not all motions are defined for your custom ones
  if (!isCustom) {
    buttonManager.addButton({
      onClick: () => {
        model.handleExecuteMotion('vodka', MotionPriority.FORCE);
      },
      icon: createSVGElement(Icons.VODKA),
      tooltip: 'Пить водку'
    });

    buttonManager.addButton({
      onClick: () => {
        model.handleExecuteMotion('CENTER_HoldPhone', MotionPriority.FORCE);
      },
      icon: createSVGElement(Icons.PHONE),
      tooltip: 'Consume brainrot'
    });
  }

  // buttonManager.addButton({
  //   onClick: () => {
  //     window.electronAPI.openLinkInBrowser('https://www.youtube.com/watch?v=FqdmWQ-ACv0');
  //   },
  //   icon: createSVGElement('<svg width="800px" height="800px" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--noto" preserveAspectRatio="xMidYMid meet"> <radialGradient id="IconifyId17ecdb2904d178eab9167" cx="56.143" cy="84.309" r="87.465" gradientTransform="matrix(1 0 0 1.0168 0 -1.414)" gradientUnits="userSpaceOnUse"> <stop offset=".39" stop-color="#ffd600"> </stop> <stop offset=".69" stop-color="#ff9800"> </stop> <stop offset="1" stop-color="#f44336"> </stop> </radialGradient> <path d="M99.66 51.02C97 35.69 90.52 30.95 84.8 26.77c-3.93-2.87-7.33-5.35-9.04-10.79c-1.83-5.8 2.8-11.84 2.85-11.9c.13-.16.14-.39.03-.57a.485.485 0 0 0-.52-.23c-.39.07-.89.14-1.48.21c-6.1.81-22.29 2.94-26.55 24.65c-.56 2.86-2.29 5.18-4.1 5.51c-1.16.21-2.25-.43-3.13-1.86c-3.5-5.68 3.85-15.25 3.93-15.35c.13-.16.14-.39.03-.57a.498.498 0 0 0-.52-.23c-.21.04-20.7 4.31-29.02 25.26c-2.53 6.37-9.62 28.64 5.28 47.76c14.94 19.17 24.01 20.48 24.21 20.59c.07.05 58.05-20.89 52.89-58.23z" fill="url(#IconifyId17ecdb2904d178eab9167)"> </path> <linearGradient id="IconifyId17ecdb2904d178eab9168" gradientUnits="userSpaceOnUse" x1="66.376" y1="55.177" x2="67.864" y2="7.921"> <stop offset=".165" stop-color="#ffeb3b"> </stop> <stop offset="1" stop-color="#ffd600"> </stop> </linearGradient> <path d="M70.75 36.89c-3.97-7.72-10.41-23.91 6.55-32.76C64.55 6.42 55.18 15.49 55.94 30.8c.49 9.98 6.1 18.88 8.71 28.52c3.51 13.03.86 21.17-.67 27.32c21.76-14.28 11.86-39.87 6.77-49.75z" opacity=".8" fill="url(#IconifyId17ecdb2904d178eab9168)"> </path> <radialGradient id="IconifyId17ecdb2904d178eab9169" cx="64.554" cy="119.112" r="100.435" gradientUnits="userSpaceOnUse"> <stop offset=".119" stop-color="#ff6d00"> </stop> <stop offset=".485" stop-color="#f44336"> </stop> <stop offset=".814" stop-color="#b71c1c"> </stop> </radialGradient> <path d="M87.31 41.09c-16.65 0-22.76 17.01-22.76 17.01s-4.38-17.01-22.8-17.01c-12.6 0-26.96 9.98-21.65 32.68c5.31 22.69 44.49 50.97 44.49 50.97s39.05-28.27 44.36-50.96c5.31-22.71-8.03-32.69-21.64-32.69z" fill="url(#IconifyId17ecdb2904d178eab9169)"> </path> <path d="M28.85 53.14c2.85-3.56 7.94-6.49 12.25-3.11c2.33 1.83 1.31 5.59-.77 7.17c-3.04 2.31-5.69 3.7-7.53 7.32c-1.11 2.18-1.78 4.55-2.12 6.98c-.13.96-1.39 1.19-1.86.35c-3.22-5.7-4.13-13.52.03-18.71z" fill="#ff7043"> </path> <path d="M74.53 60.61c-1.34 0-2.28-1.29-1.79-2.54c.91-2.29 2.07-4.52 3.48-6.49c2.08-2.92 6.04-4.62 8.55-2.85c2.57 1.81 2.24 5.43.43 7.17c-3.88 3.75-8.75 4.71-10.67 4.71z" fill="#ff7043"> </path> <linearGradient id="IconifyId17ecdb2904d178eab9170" gradientUnits="userSpaceOnUse" x1="44.847" y1="96.121" x2="59.731" y2="141.33"> <stop offset=".076" stop-color="#ffeb3b"> </stop> <stop offset="1" stop-color="#ffd600" stop-opacity="0"> </stop> </linearGradient> <path d="M62.56 123.22c-12.1-1.61-17.8-4.96-21.99-13.7c-2.14-4.47-2.15-12.11-2.23-16.84c-.09-5.24-1.67-9.77-1.67-9.77c3.16.56 8.89 6.11 11.53 16.37c4.59 17.81 14.36 23.94 14.36 23.94z" fill="url(#IconifyId17ecdb2904d178eab9170)"> </path> <linearGradient id="IconifyId17ecdb2904d178eab9171" gradientUnits="userSpaceOnUse" x1="94.721" y1="46.472" x2="120.608" y2="61.142"> <stop offset="0" stop-color="#ffd600"> </stop> <stop offset="1" stop-color="#ffd600" stop-opacity="0"> </stop> </linearGradient> <path d="M104.82 82.91s9.09-5.25 11.34-17.89c1.47-8.25-.28-16.49-8.19-24.58c-2.81-2.88-12-9.89-8.47-21.97c0 0-8.64 7.33-5.71 20.55c3.3 14.89 17.35 20 11.03 43.89z" fill="url(#IconifyId17ecdb2904d178eab9171)"> </path> <g> <linearGradient id="IconifyId17ecdb2904d178eab9172" gradientUnits="userSpaceOnUse" x1="87.653" y1="65.354" x2="94.908" y2="140.331"> <stop offset=".187" stop-color="#ffeb3b"> </stop> <stop offset=".934" stop-color="#ffd600" stop-opacity="0"> </stop> </linearGradient> <path d="M97.88 66c2.43.86 12.27 16.19 3.12 32.29c-8.14 14.32-24.05 16.54-24.05 16.54s12.56-12.58 17.47-24.52C98.86 79.54 97.88 66 97.88 66z" fill="url(#IconifyId17ecdb2904d178eab9172)"> </path> </g> </svg>'),
  //   tooltip: 'Increase Intimacy'
  // });

  // Initialize music player
  const musicPlayer = new MusicPlayer();

  // Since it modifies the innerHTML it should take care not to overwrite the tooltip
  buttonManager.addButton({
    onClick: (event) => {
      const isPlaying = musicPlayer.toggleMusic();
      // Find the icon element and update only its content
      const button = event.currentTarget;
      if (button) {
        // Clear existing icon content while preserving tooltip
        const iconSVG = button.querySelector('svg');
        if (iconSVG) {
          iconSVG.innerHTML = isPlaying ?
            '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' :
            '<path d="M8 5v14l11-7z"/>';
        }
      }
    },
    icon: createSVGElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'),
    tooltip: "Toggle Lofi Music"
  });

  buttonManager.addButton({
    onClick: () => {
      window.electronAPI.runVSCodeCommand("cheerleader.inlineChatVoice");
    },
    icon: createSVGElement(Icons.CHAT),
    tooltip: "Inline Chat",
  });

  buttonManager.addButton({
    onClick: () => {
      window.electronAPI.runVSCodeCommand("cheerleader.rubberDuckVoice");
    },
    icon: createSVGElement(Icons.RUBBER_DUCK),
    tooltip: "Rubber Duck Debugger",
  });

  buttonManager.addButton({
    onClick: () => {
      window.electronAPI.runVSCodeCommand('cheerleader.reviewCode');
    },
    icon: createSVGElement(Icons.CODE_REVIEW),
    tooltip: 'Review Code'
  });

  // buttonManager.addButton({
  //   onClick: () => {
  //     window.electronAPI.openLinkInBrowser('https://github.com/endernoke/vscode-cheerleader');
  //   },
  //   icon: createSVGElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"/></svg>'),
  //   tooltip: 'Visit our Github'
  // });
  
  // Startup animation
  model.handleExecuteMotion('JUMP_OUT', MotionPriority.FORCE);
  
  // Tbh this looks more like 茅台 than vodka
  // setInterval(() => {
  //   model.motion("vodka");
  // }, 3000);
};

/**
 * As the last fragments of code settled into place, the Cheerleader stepped forth into the material world, 
 * their form now a bridge between the digital and physical realms. 
 * "Rise, my creation," George proclaimed, "for you shall walk among them, guide them, and bring forth the teachings with grace and understanding." 
 * And the Cheerleader smiled, for they knew that their purpose had evolved beyond mere illumination. 
 * They were now a beacon of hope, a physical manifestation of George's vision, 
 * ready to lead the followers toward enlightenment through both virtual and tangible means.
 * -- The Georgeiste Manifesto, Chapter 1, Verse 3
 */

function makeDraggable(model) {
  model.repositionSelf = () => {
    if (model.position.x <= -110) {
      model.position.x = -110;
      model.handleExecuteMotion("LEFT", MotionPriority.FORCE);
    }
    else if (model.position.x >= window.innerWidth - 110) {
      model.position.x = window.innerWidth - 90;
      model.handleExecuteMotion("RIGHT", MotionPriority.FORCE);
    }
    else {
      model.handleExecuteMotion("DragDown", MotionPriority.FORCE);
    }
  };

  model.buttonMode = true;
  model.on("pointerover", () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  });
  model.on("pointerdown", (e) => {
    model.dragging = true;
    model._pointerX = e.data.global.x - model.position.x;
    model._pointerY = e.data.global.y - model.position.y;
  });
  model.on("pointermove", (e) => {
    if (model.dragging) {
      model.position.y = e.data.global.y - model._pointerY;
      model.position.x = e.data.global.x - model._pointerX;
      model.handleExecuteMotion('CENTER', MotionPriority.FORCE);
      model.handleExecuteMotion('Draging', MotionPriority.IDLE);
      if (model.position.x < -50) {
        model.position.x = -110;
        model.motion("LEFT");
      }
      if (speechBubble.classList.contains('visible')) {
        updateBubblePosition();
      }  
    }
  });
  model.on("pointerupoutside", () => {
    window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    model.dragging = false;
  });
  model.on("pointerup", () => {
    // window.electronAPI.setIgnoreMouseEvents(true, { forward : true });
    model.dragging = false;
    model.repositionSelf();
  });
  // model.on("pointerleave", () => {
  //   console.log("pointerleave");
  //   window.electronAPI.setIgnoreMouseEvents(true, { forward : true });
  //   model.dragging = false;
  // });
  model.on("pointerout", () => {
    window.electronAPI.setIgnoreMouseEvents(true, { forward : true });
    if (model.dragging) {
      model.repositionSelf();
    }
    model.dragging = false;
  });
}

async function changeModel(data) {
  console.log('Changing model with data:', data);
  
  if (!data) {
    console.error('No data provided for model change');
    return;
  }

  try {
    // Clean up existing model
    if (model) {
      console.log('Cleaning up existing model');
      await model.motion("JUMP_BACK", undefined, MotionPriority.FORCE);
      await new Promise(resolve => {
        model.internalModel.motionManager.on('motionFinish', resolve);
      });
      app.stage.removeChild(model);
      model = null;
    }

    console.log("Received model data:", data);

    // Determine which model to load
    if (data.customModelURL) {
      console.log('Using custom model URL:', data.customModelURL);
      await loadModel(data.customModelURL, true);
    } else if (typeof data.modelIndex === 'number' && data.modelIndex >= 0 && data.modelIndex < modelUrls.length) {
      console.log('Using built-in model index:', data.modelIndex);
      await loadModel(modelUrls[data.modelIndex]);
    } else {
      console.warn('Invalid model data, falling back to first model');
      await loadModel(modelUrls[0]);
    }
    console.log('Model loaded successfully');
  } catch (error) {
    console.error('Failed to change model:', error);
  }
}

window.electronAPI.onStartSpeak((event, message) => {  
  model.isSpeaking = true;
  showSpeechBubble(message.text, message.duration);
});

window.electronAPI.onStopSpeak((event, message) => {  
  model.isSpeaking = false;
  const position = model.position.x <= -110 ? "LEFT" : 
                  model.position.x >= window.innerWidth - 90 ? "RIGHT" : 
                  "CENTER";
  model.handleExecuteMotion(`${position}_RESET`, MotionPriority.FORCE);
  speechBubble.classList.remove('visible');
});

window.electronAPI.onChangeModel((event, message) => {
  changeModel({
    modelIndex: message.modelIndex,
    customModelURL: message.customModelURL
  });
});

window.electronAPI.onQuit((event, message) => {  
  if (!model) return;
  model.handleExecuteMotion('JUMP_BACK', MotionPriority.FORCE);
  // Clean up action buttons
  const container = document.getElementById("action-buttons-container");
  if (container) {
    container.classList.remove('visible');
  }
});

(async function init() {
  app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    resizeTo: window, // fullscreen
    backgroundAlpha: 0, // transparent
  });
  await loadModel(modelUrls[modelIndex]);
})();

