// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { Titlebar, TitlebarColor } from "custom-electron-titlebar";

const options = {
    backgroundColor: TitlebarColor.fromHex('#0000'),
    itemBackgroundColor: TitlebarColor.fromHex('#08162F'),
    containerOverflow: 'hidden',
    icon: 'main_window/assets/images/window-icon.png',
};

window.addEventListener('DOMContentLoaded', () => {
  // Title bar implementation
  new Titlebar(options);
});