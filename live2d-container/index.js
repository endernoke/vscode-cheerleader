const modelUrl = "https://download.doudou.fun/models/Nika/Nika.model3.json";

const live2d = PIXI.live2d;
const MotionPriority = live2d.MotionPriority;

(async function main() {
  const noResetMotions = ['RESET', 'JUMP_BACK'];

  const container = document.getElementById("live2d-container");
  const app = new PIXI.Application({
    view: document.getElementById("canvas"),
    autoStart: true,
    resizeTo: window, // fullscreen
    backgroundAlpha: 0, // transparent
  });

  const model = await live2d.Live2DModel.from(
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