import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { requestAPI } from './handler';

// import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { Widget } from '@lumino/widgets';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell],
  activate: async (
    app: JupyterFrontEnd,
    // browserFactory: IFileBrowserFactory, 
    shell: ILabShell
    ) => {
    console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

    let data = null;
    try {
      data = await requestAPI<any>('get-example');
      console.log(data);
    } catch (reason) {
      console.error(
        `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
      ); 
    }
        // Create a blank content widget inside of a MainAreaWidget
        const widget = new Widget();
        widget.id = '@jupyterlab-sidepanel/example';
        widget.title.iconClass = "jp-SpreadsheetIcon jp-SideBar-tabIcon";
        widget.title.caption = "Side Panel";

        let summary = document.createElement('p');
        widget.node.appendChild(summary);

        // const cwd = browserFactory.tracker.currentWidget?.model.path;
        // let cwd:string = browserFactory.tracker.currentWidget?.model.path!; 
        // console.log(cwd);
        summary.innerHTML = data['data'];
        summary.insertAdjacentHTML("afterend", data['cwd'])
        shell.add(widget, 'left');  
  }
};

export default plugin;
