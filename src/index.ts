import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell,
} from '@jupyterlab/application';
import { requestAPI } from './handler';
import { Widget } from '@lumino/widgets';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell],
  activate: async (app: JupyterFrontEnd, shell: ILabShell) => {
    console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

    // Create the widget only once
    const widget = new Widget();
    widget.id = '@jupyterlab-sidepanel/example';
    widget.title.iconClass = 'jp-SpreadsheetIcon jp-SideBar-tabIcon';
    widget.title.caption = 'Side Panel';

    let summary = document.createElement('p');
    widget.node.appendChild(summary);

    // Attach the `activate` event handler to the widget
    widget.activate = async () => {
      console.log('Widget shown');

      // Make the API request and update the widget's content
      try {
        const data = await requestAPI<any>('get-toc', document.URL);
        console.log(data);
        summary.innerHTML = data['data'];
        summary.insertAdjacentHTML('afterend', data['cwd']);
      } catch (reason) {
        console.error(
          `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
        );
      }
    };

    // Add the widget to the sidebar
    shell.add(widget, 'left', { rank: 100 });

    // Initially trigger the widget's activation
    widget.activate();
  },
};

export default plugin;
