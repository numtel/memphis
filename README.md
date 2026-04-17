# Memphis Components Demo

Custom elements implementation of a Windows 98 (codename Memphis) style menu system.

## Elements

The Memphis menu system uses a set of semantic custom elements to build accessible, keyboard-navigable desktop-style application menus.

### Hierarchy

To construct a menu bar, nest the elements as follows:

```html
<memphis-menubar>
  <memphis-menu>
    <memphis-menu-trigger>File</memphis-menu-trigger>
    <memphis-menu-popup>
      <memphis-menu-item cmd="api.newFile" key="F2">New</memphis-menu-item>
      <memphis-menu-sep></memphis-menu-sep>
      <memphis-menu-item cmd="api.openFile">Open...</memphis-menu-item>
    </memphis-menu-popup>
  </memphis-menu>
</memphis-menubar>
```

### Available Elements

* `<memphis-menubar>`: The top-level flex container that spans the width of its parent, acting as the main toolbar background.
* `<memphis-menu>`: A logical grouping container for a single dropdown menu category (e.g., File, Edit).
* `<memphis-menu-trigger>`: The clickable label visible in the menubar. The first letter of the text content is automatically mapped to an `Alt + [Key]` mnemonic shortcut.
* `<memphis-menu-popup>`: The hidden floating container that holds the menu items. Automatically managed by the JavaScript system.
* `<memphis-menu-item>`: An actionable button within the menu popup. 
* `<memphis-menu-sep>`: A visual horizontal separator used to group related commands within a popup.

### Item Attributes

The `<memphis-menu-item>` element supports two primary attributes for functionality:

* **`cmd`**: A dot-notation string referencing a global function on the `window` object to execute when the item is clicked or triggered via keyboard. 
    * *Example:* `cmd="api.saveFile"` will invoke `window.api.saveFile({ target: element })`. 
* **`key`**: A string representing the keyboard shortcut for this command (e.g., `key="F4"`, `key="S"`). This string is visually displayed on the right edge of the menu item and is automatically bound to global `keydown` event listeners by the system.

## JavaScript API

### `setGroupChecked(element)`
Imported from `menuSystem.js`, this function allows you to create radio-button style toggle behavior for menu items. 

When called, it adds an `active` class (displaying a checkmark) to the target element and removes the `active` class from any sibling `<memphis-menu-item>` elements. The "group" of siblings is bounded by the nearest `<memphis-menu-sep>` separators (or the top/bottom of the menu popup).

**Usage Example:**

```javascript
import { setGroupChecked } from './menuSystem.js';

class MenuActions {
  // Bound via cmd="actions.setHorizontal"
  setHorizontal(event) {
    // Check this item, uncheck other items in this separator-bounded block
    setGroupChecked(event.target); 
    // ... perform horizontal layout logic
  }
}

window.actions = new MenuActions();
```

## License

MIT
