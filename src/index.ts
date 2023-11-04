import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { Widget } from '@lumino/widgets';

/**
 * Initialization data for the jlab-jbook-chapter-navigation extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell],
  activate: (app: JupyterFrontEnd, shell: ILabShell) => {
    console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');
    
    // Create a blank content widget inside of a MainAreaWidget
    const widget = new Widget();
    widget.id = '@jupyterlab-sidepanel/example';
    widget.title.iconClass = "jp-SpreadsheetIcon jp-SideBar-tabIcon";
    widget.title.caption = "Side Panel";

    let summary = document.createElement('p');
    widget.node.appendChild(summary);

    summary.innerText = "Hello, World!";

    shell.add(widget, 'left');  
  }
};

export default extension;