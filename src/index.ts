import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell,
} from '@jupyterlab/application';
import { requestAPI } from './handler';
import { Widget } from '@lumino/widgets';

import { FileBrowser } from '@jupyterlab/filebrowser';

// import { IDocumentManager } from '@jupyterlab/docmanager';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

// import { ContentsManager } from '@jupyterlab/services';


const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell, IFileBrowserFactory],
  activate: async (app: JupyterFrontEnd, shell: ILabShell, fileBrowserFactory: IFileBrowserFactory) => {
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

      // Get the primary file browser used in JupyterLab
      const fileBrowser = fileBrowserFactory.tracker.currentWidget; 

      // Check if the file browser is available and log if it's not
      if (!fileBrowser) {
        console.error('File browser current widget is null.');
      }

      // Make the API request and update the widget's content
      try {
        const data = await requestAPI<any>('get-toc', fileBrowser?.model.path);
        console.log(data);
        summary.innerHTML = data['data'];
        // Add the event listener after the widget's content is updated
        addClickListenerToButtons(fileBrowser);
      } catch (reason) {
        console.error(
          `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
        );
      }
    };

    // Add the widget to the sidebar
    shell.add(widget, 'left', { rank: 400 });

    // Initially trigger the widget's activation
    widget.activate();
  },
};

export default plugin;

function addClickListenerToButtons(fileBrowser: FileBrowser | null) {
  const buttons = document.querySelectorAll('.toc-button');
  buttons.forEach((button) => {
      button.addEventListener('click', (event: Event) => {
          const index = button.getAttribute('data-index');
          console.log(`Button ${index} clicked`);

          // Check if the file browser is available
          if (!fileBrowser) {
              console.error('File browser is not available.');
              return;
          }

          // Check if the file browser's path is a valid string
          if (typeof fileBrowser.model.path !== 'string') {
              console.error(`Invalid path: The current path is either not set or not a string. Path: ${fileBrowser.model.path}`);
              return;
          }
          // If all checks pass, log the current directory
          console.log(`Current directory: ${fileBrowser.model.path}`);
      });
  });
}





// import {
//   JupyterFrontEnd,
//   JupyterFrontEndPlugin,
//   ILabShell,
// } from '@jupyterlab/application';
// import { requestAPI } from './handler';
// import { Widget } from '@lumino/widgets';

// const plugin: JupyterFrontEndPlugin<void> = {
//   id: 'jlab-jbook-chapter-navigation:plugin',
//   description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
//   autoStart: true,
//   requires: [ILabShell],
//   activate: async (app: JupyterFrontEnd, shell: ILabShell) => {
//     console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

//     // Create the widget only once
//     const widget = new Widget();
//     widget.id = '@jupyterlab-sidepanel/example';
//     widget.title.iconClass = 'jp-SpreadsheetIcon jp-SideBar-tabIcon';
//     widget.title.caption = 'Side Panel';

//     let summary = document.createElement('p');
//     widget.node.appendChild(summary);

//     // Attach the `activate` event handler to the widget
//     widget.activate = async () => {
//       console.log('Widget shown');

//       // Make the API request and update the widget's content
//       try {
//         const data = await requestAPI<any>('get-toc', document.URL);
//         console.log(data);
//         summary.innerHTML = data['data'];
//         // Add the event listener after the widget's content is updated
//         addClickListenerToButtons();
//       } catch (reason) {
//         console.error(
//           `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
//         );
//       }
//     };

//     // Add the widget to the sidebar
//     shell.add(widget, 'left', { rank: 100 });

//     // Initially trigger the widget's activation
//     widget.activate();
//   },
// };

// export default plugin;

// function addClickListenerToButtons() {
//   const buttons = document.querySelectorAll('.toc-button');
//   buttons.forEach((button) => {
//     button.addEventListener('click', (event: Event) => {
//       const index = button.getAttribute('data-index');
//       console.log(`Button ${index} clicked`);
//       // Add your custom logic here
//     });
//   });
// }
