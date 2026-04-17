let activeMenu = null;
let dragStartedOnTrigger = false;

// Dynamically add tabindex so custom elements behave correctly with JS .focus()
document.querySelectorAll('memphis-menu-trigger, memphis-menu-item').forEach(el => el.setAttribute('tabindex', '0'));

// Auto-generate mnemonic map based on trigger text
const mnemonicMap = {};
document.querySelectorAll('memphis-menu-trigger').forEach((trigger, index) => {
  const firstChar = trigger.textContent.trim().charAt(0).toLowerCase();
  if (firstChar) mnemonicMap[firstChar] = index;
});

const closeAllMenus = () => {
  document.querySelectorAll('memphis-menu-popup').forEach(m => m.removeAttribute('open'));
  document.querySelectorAll('memphis-menu-trigger').forEach(b => b.classList.remove('active'));
  activeMenu = null;
  dragStartedOnTrigger = false;
};

const openMenu = (trigger) => {
  const menu = trigger.parentElement.querySelector('memphis-menu-popup');
  if (activeMenu === menu) return; 

  closeAllMenus();
  trigger.classList.add('active');
  menu.setAttribute('open', '');
  trigger.focus(); 
  activeMenu = menu;
};

const menubarElement = document.querySelector('memphis-menubar');
if (menubarElement) {
  menubarElement.addEventListener('pointermove', (e) => {
    if (activeMenu) {
      const item = e.target.closest('memphis-menu-item, input');
      if (item && document.activeElement !== item) {
        item.focus();
      }
    }
  });

  menubarElement.addEventListener('pointerdown', (e) => {
    const trigger = e.target.closest('memphis-menu-trigger');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      if (activeMenu && activeMenu === trigger.parentElement.querySelector('memphis-menu-popup')) {
        closeAllMenus();
      } else {
        openMenu(trigger);
        dragStartedOnTrigger = true;
      }
    }
  });

  menubarElement.addEventListener('pointerover', (e) => {
    const trigger = e.target.closest('memphis-menu-trigger');
    if (trigger && activeMenu) openMenu(trigger);
  });
}

function shiftMenu(direction) {
  const triggers = Array.from(document.querySelectorAll('memphis-menu-trigger'));
  const currentTrigger = activeMenu.parentElement.querySelector('memphis-menu-trigger');
  let newIndex = (triggers.indexOf(currentTrigger) + direction + triggers.length) % triggers.length;
  
  openMenu(triggers[newIndex]);
  const firstItem = activeMenu.querySelector('memphis-menu-item, input');
  if (firstItem) firstItem.focus();
}

window.addEventListener('keydown', (e) => {
  const code = e.code.replace(/(Digit|Key)/, '');
  if(code === 'Escape') {
    closeAllMenus();
    return;
  }
  if(document.querySelector('dialog:not(.menu)[open]') !== null) return;

  if (e.altKey) {
    e.preventDefault();
    const char = e.key.toLowerCase();
    if (mnemonicMap[char] !== undefined) {
      const triggers = document.querySelectorAll('memphis-menu-trigger');
      openMenu(triggers[mnemonicMap[char]]);
      activeMenu.querySelector('memphis-menu-item')?.focus();
      return;
    }
  }

  let tool = document.querySelector(`memphis-menu-item[key="${code}"], memphis-menu-item[key="${e.key}"]`);
  if (!tool && activeMenu) {
    const items = Array.from(activeMenu.querySelectorAll('memphis-menu-item, input'));
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      shiftMenu(e.key === 'ArrowRight' ? 1 : -1);
    }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (document.activeElement?.tagName.toLowerCase() === 'memphis-menu-item') {
        tool = document.activeElement;
      } else {
        tool = activeMenu.querySelector('memphis-menu-item:hover');
      }
    }
    
    if(!tool) return; 
    if(tool) closeAllMenus();
  }

  if(tool) {
    e.preventDefault();
    if (e.repeat) return;
    const cmd = tool.getAttribute('cmd');
    if (cmd) menuClicks(cmd, tool);
    closeAllMenus();
  }
});

// Invoke global window object dynamically
function menuClicks(command, tool) {
  if (!command) return;
  const parts = command.split('.');
  let targetFunc = window;
  
  for (let i = 0; i < parts.length - 1; i++) {
    targetFunc = targetFunc[parts[i]];
    if (!targetFunc) return console.error('Command path not found:', command);
  }
  
  const method = targetFunc[parts[parts.length - 1]];
  if (typeof method === 'function') {
    // Pass a synthetic event so event.target resolves directly to the tool triggered
    method.call(targetFunc, { target: tool });
  } else {
    console.error('Invalid command executed:', command);
  }
}

window.addEventListener('pointerup', (e) => {
  const item = e.target.closest('memphis-menu-item');
  const isInsideTrigger = e.target.closest('memphis-menu-trigger');
  const isInsideMenu = e.target.closest('memphis-menu-popup');

  if (item) {
    const cmd = item.getAttribute('cmd');
    if (cmd) menuClicks(cmd, item);
    closeAllMenus();
  } else if (!isInsideTrigger && !isInsideMenu) {
    closeAllMenus();
  }
  dragStartedOnTrigger = false;
});

// Uncheck active element boundaries dynamically
export function setGroupChecked(element) {
  if (!element) return;
  const popup = element.closest('memphis-menu-popup');
  if (!popup) return;

  const children = Array.from(popup.children);
  const index = children.indexOf(element);
  if (index === -1) return;

  let startIndex = index;
  while (startIndex > 0 && children[startIndex - 1].tagName.toLowerCase() !== 'memphis-menu-sep') {
      startIndex--;
  }

  let endIndex = index;
  while (endIndex < children.length - 1 && children[endIndex + 1].tagName.toLowerCase() !== 'memphis-menu-sep') {
      endIndex++;
  }

  // Clear 'active' from all siblings in the bounded group
  for (let i = startIndex; i <= endIndex; i++) {
      if (children[i].tagName.toLowerCase() === 'memphis-menu-item') {
          children[i].classList.remove('active');
      }
  }

  // Toggle active back on the specifically targeted element
  element.classList.add('active');
}
