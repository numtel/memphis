import {setGroupChecked} from './menuSystem.js';

// Editor State
// Load saved data or default to an empty array
let gridData = JSON.parse(localStorage.getItem('gridData')) || [];
let cursor = JSON.parse(localStorage.getItem('editorCursor')) || { x: 0, y: 0 };
let mode = localStorage.getItem('editorMode') || 'horizontal';
// Keep synced with .cell height/width in style.css
// And #editor-container padding
const cellSize = 20;

const editorContainer = document.getElementById('editor-container');

// Optimization: State caching for Virtualization
const cellCache = new Map();
let currentCursorElement = null;
let maxCols = 1;
let maxRows = 1;
let scrollRafId = null;

// Completely clears the DOM and cache when loading new files
function resetEditorDOM() {
  editorContainer.innerHTML = '';
  cellCache.clear();
  currentCursorElement = null;
}

// Scans the data to ensure the underlying CSS Grid matches the document size
function updateBounds() {
  maxCols = cursor.x + 1;
  maxRows = cursor.y + 1;

  for (let y = 0; y < gridData.length; y++) {
    if (gridData[y]) {
      maxRows = Math.max(maxRows, y + 1);
      maxCols = Math.max(maxCols, gridData[y].length);
    }
  }

  // FIX: Add padding to allow scrolling past the end of the text
  maxCols += 15;
  maxRows += 15;

  const colStyle = `repeat(${maxCols}, ${cellSize}px)`;
  const rowStyle = `repeat(${maxRows}, ${cellSize}px)`;

  if (editorContainer.style.gridTemplateColumns !== colStyle) {
    editorContainer.style.gridTemplateColumns = colStyle;
  }
  if (editorContainer.style.gridTemplateRows !== rowStyle) {
    editorContainer.style.gridTemplateRows = rowStyle;
  }
}

// Virtualized rendering: Only draws what is visible on screen
// FIX: Added scrollToCursor parameter to prevent fighting manual scrolling
function renderEditor(scrollToCursor = false) {
  const scrollLeft = editorContainer.scrollLeft || 0;
  const scrollTop = editorContainer.scrollTop || 0;
  const clientWidth = editorContainer.clientWidth || window.innerWidth;
  const clientHeight = editorContainer.clientHeight || window.innerHeight;

  // Calculate visible bounds with a buffer for smooth scrolling
  const startX = Math.max(0, Math.floor(scrollLeft / cellSize) - 10);
  const endX = Math.min(maxCols, Math.ceil((scrollLeft + clientWidth) / cellSize) + 10);
  const startY = Math.max(0, Math.floor(scrollTop / cellSize) - 10);
  const endY = Math.min(maxRows, Math.ceil((scrollTop + clientHeight) / cellSize) + 10);

  if (currentCursorElement) {
    currentCursorElement.classList.remove('cursor');
  }

  const fragment = document.createDocumentFragment();
  let nodesAdded = false;
  const currentValidKeys = new Set();

  // Create list of cells to render (visible viewport + cursor location)
  const renderKeys = [];
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      renderKeys.push({x, y});
    }
  }
  
  // Ensure cursor is always rendered so scrollIntoView doesn't fail
  if (cursor.x < startX || cursor.x >= endX || cursor.y < startY || cursor.y >= endY) {
    renderKeys.push({x: cursor.x, y: cursor.y});
  }

  for (const pos of renderKeys) {
    const {x, y} = pos;
    const key = `${x},${y}`;
    currentValidKeys.add(key);

    let cell = cellCache.get(key);
    const char = (gridData[y] && gridData[y][x]) ? gridData[y][x] : '';

    // Create DOM element only if it doesn't already exist
    if (!cell) {
      cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      
      // Explicitly map DOM to CSS Grid coordinates for virtualization
      cell.style.gridColumn = x + 1;
      cell.style.gridRow = y + 1;
      
      cellCache.set(key, cell);
      fragment.appendChild(cell);
      nodesAdded = true;
    }

    // Only update text to avoid layout thrashing
    if (cell.textContent !== char) {
      cell.textContent = char;
    }

    if (x === cursor.x && y === cursor.y) {
      cell.classList.add('cursor');
      currentCursorElement = cell;
    }
  }

  if (nodesAdded) {
    editorContainer.appendChild(fragment);
  }

  // Prune cells that have scrolled out of the active viewport buffer
  for (const [key, cell] of cellCache.entries()) {
    if (!currentValidKeys.has(key)) {
      cell.remove();
      cellCache.delete(key);
    }
  }

  // FIX: Only scroll into view if explicitly requested (e.g. typing/navigating)
  if (scrollToCursor && currentCursorElement) {
    currentCursorElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function updateAndRender() {
  updateBounds();
  renderEditor(true); // True here means keyboard/actions will snap to cursor

  // Save the current grid state to localStorage
  localStorage.setItem('gridData', JSON.stringify(gridData));
  localStorage.setItem('editorCursor', JSON.stringify(cursor));
}

// Listen to scrolling to trigger new virtualization frames
editorContainer.addEventListener('scroll', () => {
  if (scrollRafId) cancelAnimationFrame(scrollRafId);
  scrollRafId = requestAnimationFrame(() => {
    // False here ensures passive scrolling doesn't snap back to cursor
    renderEditor(false); 

    // Save scroll position
    localStorage.setItem('editorScroll', JSON.stringify({
      left: editorContainer.scrollLeft,
      top: editorContainer.scrollTop
    }));
  });
});

// Mathematical click handler
function updateFromPointer(e) {
  const rect = editorContainer.getBoundingClientRect();
  // Get the padding value (matches the 20px in style.css)
  const padding = cellSize;

  const x = e.clientX - rect.left + editorContainer.scrollLeft;
  const y = e.clientY - rect.top + editorContainer.scrollTop;

  // Subtract the padding before dividing by cellSize
  const targetX = Math.floor((x - padding) / cellSize);
  const targetY = Math.floor((y - padding) / cellSize);

  if (targetX >= 0 && targetY >= 0 && targetX < maxCols && targetY < maxRows) {
    cursor.x = targetX;
    cursor.y = targetY;
    updateAndRender(); // Will snap to the cell clicked
  }
}

let pointerDown = false;
editorContainer.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  updateFromPointer(e);
});
editorContainer.addEventListener('pointermove', (e) => {
  if(pointerDown) updateFromPointer(e);
});
window.addEventListener('pointerup', (e) => {
  pointerDown = false;
  if(e.target.classList && e.target.classList.contains('cell')) {
    updateFromPointer(e);
  }
});

// Global Keyboard Handler
window.addEventListener('keydown', (e) => {
  if (document.querySelector('memphis-menu-popup[open]')) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }

  let update = false;

  if (e.key.length === 1) {
    e.preventDefault();

    while (gridData.length <= cursor.y) gridData.push([]);
    // Sometimes after a rotate, there will be holes not at the end of the array
    // Ensure the specific row exists, even if it's a "hole" inside the array bounds
    if (!gridData[cursor.y]) gridData[cursor.y] = [];

    gridData[cursor.y][cursor.x] = e.key;

    if (mode === 'horizontal') cursor.x++;
    else cursor.y++;
    update = true;
  } else if (e.key === 'Enter') {
    if (mode === 'horizontal') {
      cursor.x = 0;
      cursor.y++;
    } else {
      cursor.y = 0;
      cursor.x++;
    }
    update = true;
  } else if (e.key === 'Backspace') {
    if (mode === 'horizontal') {
      if (cursor.x > 0) cursor.x--;
      else if (cursor.y > 0) {
        cursor.y--;
        cursor.x = gridData[cursor.y] ? gridData[cursor.y].length : 0;
      }
    } else {
      if (cursor.y > 0) cursor.y--;
      else if (cursor.x > 0) {
        cursor.x--;
        cursor.y = 0;
      }
    }
    if (gridData[cursor.y]) gridData[cursor.y][cursor.x] = '';
    update = true;
  } else if (e.key === 'ArrowUp' && cursor.y > 0) {
    cursor.y--; update = true;
  } else if (e.key === 'ArrowDown') {
    cursor.y++; update = true;
  } else if (e.key === 'ArrowLeft' && cursor.x > 0) {
    cursor.x--; update = true;
  } else if (e.key === 'ArrowRight') {
    cursor.x++; update = true;
  } else if (e.key === 'Home') {
    if (mode === 'horizontal') {
      cursor.x = 0;
    } else {
      cursor.y = 0;
    }
    update = true;
  } else if (e.key === 'End') {
    if (mode === 'horizontal') {
      cursor.x = gridData[cursor.y] ? gridData[cursor.y].length : 0;
    } else {
      cursor.y = gridData.length;
    }
    update = true;
  } else if (e.key === 'PageUp') {
    if (mode === 'horizontal') {
      cursor.y = Math.max(0, cursor.y - 10);
    } else {
      cursor.x = Math.max(0, cursor.x - 10);
    }
    update = true;
  } else if (e.key === 'PageDown') {
    if (mode === 'horizontal') {
      cursor.y += 10;
    } else {
      cursor.x += 10;
    }
    update = true;
  }

  if (update) updateAndRender();
});

class MyApi {
  newFile() {
    gridData = [];
    cursor = { x: 0, y: 0 };
    resetEditorDOM();
    updateAndRender();
  }
  
  openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,text/plain';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target.result;
          const lines = data.split('\n');
          gridData = lines.map(line => line.split(''));
          cursor = { x: 0, y: 0 };
          resetEditorDOM();
          updateAndRender();
        } catch (err) {
          console.error(err);
        }
      };
      reader.onerror = (err) => console.error(err);
      reader.readAsText(file);
    };
    input.click();
  }
  
  saveFile() {
    let maxCols = 0;
    for (let y = 0; y < gridData.length; y++) {
      if (gridData[y] && gridData[y].length > maxCols) {
        maxCols = gridData[y].length;
      }
    }

    let dataText = '';
    for (let y = 0; y < gridData.length; y++) {
      let line = '';
      for (let x = 0; x < maxCols; x++) {
        line += (gridData[y] && gridData[y][x]) ? gridData[y][x] : ' ';
      }
      dataText += line.replace(/\s+$/, '') + '\n';
    }

    const blob = new Blob([dataText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  horizontal(event) {
    setGroupChecked(event.target);
    mode = 'horizontal';
    localStorage.setItem('editorMode', mode); // Save preference
  }

  vertical(event) {
    setGroupChecked(event.target);
    mode = 'vertical';
    localStorage.setItem('editorMode', mode); // Save preference
  }
  
  rotate() {
    const newGrid = [];

    // Transpose the grid: gridData[y][x] becomes newGrid[x][y]
    for (let y = 0; y < gridData.length; y++) {
      if (!gridData[y]) continue;
      for (let x = 0; x < gridData[y].length; x++) {
        const char = gridData[y][x];
        if (char) {
          if (!newGrid[x]) newGrid[x] = [];
          newGrid[x][y] = char;
        }
      }
    }

    // Fill gaps to ensure it's a dense array before updating state
    for (let i = 0; i < newGrid.length; i++) {
      if (!newGrid[i]) newGrid[i] = [];
    }

    // Update the global state
    gridData = newGrid;

    // Swap cursor coordinates so it stays with the same character
    const oldX = cursor.x;
    cursor.x = cursor.y;
    cursor.y = oldX;

    // Clear the virtualized cache and re-render the grid
    resetEditorDOM();
    updateAndRender();
  }
}

window.api = new MyApi();

// Initial render
updateAndRender();

// Restore scroll position after initial render
const savedScroll = JSON.parse(localStorage.getItem('editorScroll'));
if (savedScroll) {
  editorContainer.scrollLeft = savedScroll.left;
  editorContainer.scrollTop = savedScroll.top;
}

// Sync the menu UI with the loaded mode
const activeModeBtn = document.querySelector(`[onclick*="api.${mode}"]`);
if (activeModeBtn) {
  setGroupChecked(activeModeBtn);
}
