import {setGroupChecked} from './menuSystem.js';

class MyApi {
  newFile() {
    console.log('newfile');
  }
  openFile() {
    console.log('openfile');
  }
  saveFile() {
    console.log('saveFile');
  }
  horizontal(event) {
    setGroupChecked(event.target);
  }
  vertical(event) {
    setGroupChecked(event.target);
  }
  preferences() {
    console.log('preferences');
  }
}

window.api = new MyApi;
