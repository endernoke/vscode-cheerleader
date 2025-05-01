class ActionButton {
  constructor(options) {
    const {
      onClick,
      icon,
      tooltip = '',
      backgroundColor = 'white',
      size = 40
    } = options;

    this.element = document.createElement('button');
    this.element.className = 'action-button';
    this.element.style.width = `${size}px`;
    this.element.style.height = `${size}px`;
    this.element.style.backgroundColor = backgroundColor;
    
    if (tooltip) {
      const tooltipElement = document.createElement('div');
      tooltipElement.className = 'tooltip';
      tooltipElement.textContent = tooltip;
      this.element.appendChild(tooltipElement);
    }

    if (icon) {
      // check if icon is already an html element
      if (typeof icon === 'string') {
        const img = document.createElement('img');
        img.src = icon;
        this.element.appendChild(img);
      } else if (typeof(icon) === 'object') {// scale icon to a maximum of 80%
        icon.style.maxWidth = '80%';
        icon.style.maxHeight = '80%';
        this.element.appendChild(icon);
      } else {
        console.error('Icon must be a string or an HTML element.');
      }
    }

    // this.element.addEventListener('click', onClick);
    this.element.addEventListener('click', (event) => {
      console.log(`Button clicked: ${tooltip}`);
      onClick();
    });
  }
}

class ActionButtonsManager {
  constructor(model) {
    this.model = model;
    this.buttons = [];
    this.container = document.createElement('div');
    this.container.id = 'action-buttons-container';
    this.container.className = 'action-buttons-container';
    this.container.addEventListener('pointerover', () => {
      window.electronAPI.setIgnoreMouseEvents(false);
    });
    this.container.addEventListener('pointerout', () => {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    });
    this.container.addEventListener('pointerleave', () => {
      window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
    });
    this.container.addEventListener('pointerup', () => {
      window.electronAPI.setIgnoreMouseEvents(false);
    });
    document.getElementById("live2d-container").appendChild(this.container);

    this.showTimeout = null;
    this.hideDelay = 300;
    this.showDelay = 500;

    this.setupEventListeners();
  }

  addButton(options) {
    const button = new ActionButton(options);
    this.buttons.push(button);
    this.container.appendChild(button.element);
    this.updatePosition();
  }

  updatePosition() {
    const modelCenter = {
      x: this.model.position.x + this.model.width / 2,
      y: this.model.position.y + this.model.height / 2
    };

    // Determine if model is at left or right edge
    const isLeftSide = this.model.position.x <= -110;
    const isRightSide = this.model.position.x >= window.innerWidth - 250;

    this.container.style.position = 'absolute';
    this.container.style.top = `${modelCenter.y - (this.buttons.length * 50) / 2}px`;

    if (isRightSide) {
      // When model is on right edge, buttons should come out from right to left
      this.container.style.left = 'auto';
      this.container.style.right = `${window.innerWidth - modelCenter.x}px`;
    } else {
      // For left side and center, buttons come out from left to right
      this.container.style.left = `${modelCenter.x}px`;
      this.container.style.right = 'auto';
    }
  }

  setupEventListeners() {
    this.model.on('pointerover', () => {
      clearTimeout(this.showTimeout);
      this.showTimeout = setTimeout(() => {
        this.updatePosition();
        const side = (this.model.position.x >= window.innerWidth - 250) ? 'right' : 'left';
        this.container.classList.remove('left', 'right');
        this.container.classList.add(side);
        this.container.classList.add('visible');
      }, this.showDelay);
    });

    this.model.on('pointermove', () => {
      if (this.model.dragging) {
        clearTimeout(this.showTimeout);
        this.container.classList.remove('visible', 'left', 'right');
      }
    });

    this.model.on('pointerout', () => {
      clearTimeout(this.showTimeout);
      setTimeout(() => {
        if (!this.container.matches(':hover')) {
          this.container.classList.remove('visible', 'left', 'right');
        }
      }, this.hideDelay);
    });

    this.container.addEventListener('mouseleave', () => {
      setTimeout(() => {
        if (!this.container.matches(':hover')) {
          this.container.classList.remove('visible', 'left', 'right');
        }
      }, this.hideDelay);
    });
  }
}

export { ActionButtonsManager };