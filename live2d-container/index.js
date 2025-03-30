const modelUrl = "https://download.doudou.fun/models/Nika/Nika.model3.json";

const live2d = PIXI.live2d;
const MotionPriority = live2d.MotionPriority;

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
  console.log(`Speaking "${text}"`);
  
  // Position the bubble above the model  
  updateBubblePosition();
  
  speechTimeout = setTimeout(() => {
    speechBubble.classList.remove('visible');
  }, duration);
}

(async function main() {
  const noResetMotions = ['RESET', 'JUMP_BACK'];

  const container = document.getElementById("live2d-container");
  const app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    resizeTo: window, // fullscreen
    backgroundAlpha: 0, // transparent
  });

  model = await live2d.Live2DModel.from(
    modelUrl,
  );

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
    console.log('motionFinish');
    if (!noResetMotions.includes(model.currentMotion)) {
      if (model.position.x <= -110 || model.position.x >= window.innerWidth - 90) {
        model.handleExecuteMotion("SIDE_RESET", MotionPriority.FORCE);
      }
      else {
        model.handleExecuteMotion("RESET", MotionPriority.FORCE);
      }
    }
    if (model.currentMotion === 'JUMP_BACK') {
      // End of life
      app.stage.removeChild(model);
      return;
    }
    if (model.isSpeaking) {
      const position = model.position.x <= -110 ? "LEFT" : 
                  model.position.x >= window.innerWidth - 90 ? "RIGHT" : 
                  "CENTER";
      model.handleExecuteMotion(`${position}_SAYING`, MotionPriority.NORMAL);
    }
  });
  
  model.on("hit", (hitAreas) => {
    console.log(hitAreas);
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
  
  // Startup animation
  model.handleExecuteMotion('JUMP_OUT', MotionPriority.FORCE);
  
  // Tbh this looks more like 茅台 than vodka
  // setInterval(() => {
  //   model.motion("vodka");
  // }, 3000);
})();

/*
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
    console.log("pointerover");
    window.electronAPI.setIgnoreMouseEvents(false);
  });
  model.on("pointerdown", (e) => {
    console.log("pointerdown");
    model.dragging = true;
    model._pointerX = e.data.global.x - model.position.x;
    model._pointerY = e.data.global.y - model.position.y;
  });
  model.on("pointermove", (e) => {
    console.log("pointermove");
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
    console.log("pointerout");
    window.electronAPI.setIgnoreMouseEvents(true, { forward : true });
    if (model.dragging) {
      model.repositionSelf();
    }
    model.dragging = false;
  });
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

window.electronAPI.onQuit((event, message) => {  
  console.log("quit");
  if (!model) return;
  model.handleExecuteMotion('JUMP_BACK', MotionPriority.FORCE);
});