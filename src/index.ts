import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';
import { requestAPI } from './handler';
import { Widget } from '@lumino/widgets';

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell],
  activate: async (
    app: JupyterFrontEnd,
    shell: ILabShell
  ) => {
    console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

    let data: any = null;
    try {
      data = await requestAPI<any>('get-toc');
      console.log(data);
    } catch (reason) {
      console.error(
        `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
      );
    }

    // Create a function to add your widget
    function addWidget() {
      const widget = new Widget();
      widget.id = '@jupyterlab-sidepanel/example';
      widget.title.iconClass = "jp-SpreadsheetIcon jp-SideBar-tabIcon";
      widget.title.caption = "Side Panel";

      let summary = document.createElement('p');
      widget.node.appendChild(summary);
      summary.innerHTML = data['data'];
      summary.insertAdjacentHTML("afterend", data['cwd']);

      shell.add(widget, 'left', { rank: 100 });

      // Attach the `activate` event handler to the widget
      widget.activate = async () => {
        console.log('Widget shown');
        try {
          data = await requestAPI<any>('get-toc');
          console.log(data);
        } catch (reason) {
          console.error(
            `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
            ); 
          }

        // You can place your logic here to be executed when the widget is shown.
      };
    }

    // Use JupyterLab's `shell` object to detect when the sidebar is shown
    shell.currentChanged.connect((_, change) => {
      if (change.newValue) {
        addWidget(); // Add your widget when the sidebar is shown
      }
    });
  }
};

export default plugin;

// import {
//   JupyterFrontEnd,
//   JupyterFrontEndPlugin,
//   ILabShell
// } from '@jupyterlab/application';

// import { requestAPI } from './handler';

// import { Widget } from '@lumino/widgets';

// const plugin: JupyterFrontEndPlugin<void> = {
//   id: 'jlab-jbook-chapter-navigation:plugin',
//   description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
//   autoStart: true,
//   requires: [ILabShell],
//   activate: async (
//     app: JupyterFrontEnd,
//     shell: ILabShell
//     ) => {
//     console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

//     let data = null;
//     try {
//       data = await requestAPI<any>('get-toc');
//       console.log(data);
//     } catch (reason) {
//       console.error(
//         `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
//       ); 
//     }

//   // Define the event handler function
//   const handleWidgetFocus = async () => {
//     console.log('Widget brought in focus');
//   };

//   // Create a blank content widget inside of a MainAreaWidget
//   const widget = new Widget();
//   widget.id = '@jupyterlab-sidepanel/example';
//   widget.title.iconClass = "jp-SpreadsheetIcon jp-SideBar-tabIcon";
//   widget.title.caption = "Side Panel";

//   let summary = document.createElement('p');
//   widget.node.appendChild(summary);

//   summary.innerHTML = data['data'];
//   summary.insertAdjacentHTML("afterend", data['cwd'])
//   shell.add(widget, 'left', { rank: 100 });  

//   // Attach the event handler to the widget
//   widget.node.addEventListener('after-show', handleWidgetFocus);
//   // console.log("isVisible:");
//   // console.log(widget.isVisible);
//   }
// };

// export default plugin;


// import {
//   JupyterFrontEnd,
//   JupyterFrontEndPlugin,
//   ILabShell
// } from '@jupyterlab/application';

// import { requestAPI } from './handler';


// // import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

// import { Widget } from '@lumino/widgets';

// const plugin: JupyterFrontEndPlugin<void> = {
//   id: 'jlab-jbook-chapter-navigation:plugin',
//   description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
//   autoStart: true,
//   requires: [ILabShell],
//   activate: async (
//     app: JupyterFrontEnd,
//     // browserFactory: IFileBrowserFactory, 
//     shell: ILabShell
//     ) => {
//     console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');

//     let data = null;
//     try {
//       data = await requestAPI<any>('get-toc');
//       console.log(data);
//     } catch (reason) {
//       console.error(
//         `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
//       ); 
//     }

//   // Define the event handler function
//   const handleWidgetFocus = async () => {
//     console.log('Widget brought in focus');

//     // try {
//     //   data = await requestAPI<any>('get-toc');
//     //   console.log(data);
//     // } catch (reason) {
//     //   console.error(
//     //     `The jlab_jbook_chapter_navigation server extension appears to be missing.\n${reason}`
//     //   ); 
//     // }



//     // Perform any other actions you want when the widget is clicked
//   };
//       // Create a blank content widget inside of a MainAreaWidget

//   const widget = new Widget();
//   widget.id = '@jupyterlab-sidepanel/example';
//   widget.title.iconClass = "jp-SpreadsheetIcon jp-SideBar-tabIcon";
//   widget.title.caption = "Side Panel";

//   let summary = document.createElement('p');
//   widget.node.appendChild(summary);


//   // const cwd = browserFactory.tracker.currentWidget?.model.path;
//   // let cwd:string = browserFactory.tracker.currentWidget?.model.path!; 
//   // console.log(cwd);
//   summary.innerHTML = data['data'];
//   summary.insertAdjacentHTML("afterend", data['cwd'])
//   shell.add(widget, 'left', { rank: 100 });  

//   // Attach the event handler to the widget
//   widget.node.addEventListener('after-show', handleWidgetFocus);
//   // console.log("isVisible:");
//   // console.log(widget.isVisible);


//   }
// };

// export default plugin;
