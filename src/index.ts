import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';
import { Widget } from '@lumino/widgets';

import { FileBrowser } from '@jupyterlab/filebrowser';

import { IDocumentManager } from '@jupyterlab/docmanager';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import * as jbtoc from './jbtoc';

let appInstance: JupyterFrontEnd | null = null;

export function getJupyterAppInstance(app?: JupyterFrontEnd): JupyterFrontEnd {
  if (!appInstance && app) {
    appInstance = app;
  }
  if (!appInstance) {
    throw new Error('App instance has not been initialized yet');
  }
  return appInstance;
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-jupyterbook-navigation:plugin',
  description:
    'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  requires: [ILabShell, IFileBrowserFactory, IDocumentManager],
  activate: async (
    app: JupyterFrontEnd,
    shell: ILabShell,
    fileBrowserFactory: IFileBrowserFactory,
    docManager: IDocumentManager
  ) => {
    getJupyterAppInstance(app);
    console.log(
      'JupyterLab extension jupyterlab-jupyterbook-navigation is activated!'
    );

    const widget = new Widget();
    widget.id = '@jupyterlab-sidepanel/jupyterbook-toc';
    widget.title.iconClass = 'jbook-icon jp-SideBar-tabIcon';
    widget.title.className = 'jbook-tab';
    widget.title.caption = 'Jupyter-Book Table of Contents';

    const summary = document.createElement('p');
    widget.node.appendChild(summary);
    widget.activate = async () => {
      const fileBrowser = fileBrowserFactory.tracker.currentWidget;
      if (!fileBrowser) {
        console.debug('File browser widget is null.');
      } else {
        console.debug('Active file browser widget found.');
      }

      try {
        const cwd = fileBrowser?.model.path;
        if (typeof cwd === 'string') {
          const toc = await jbtoc.getTOC(cwd);
          summary.innerHTML = toc;
        }
        addClickListenerToButtons(fileBrowser, docManager);
        addClickListenerToChevron();
      } catch (reason) {
        console.error(`The jupyterlab_jupyterbook_navigation error: ${reason}`);
      }
    };
    shell.add(widget, 'left', { rank: 400 });
    widget.activate();
  }
};

export default plugin;

function addClickListenerToChevron() {
  const buttons = document.querySelectorAll('.toc-chevron');
  buttons.forEach(buttonElement => {
    const button = buttonElement as HTMLButtonElement;
    button.addEventListener('click', (event: Event) => {
      console.log('Button clicked');
      toggleList(button);
    });
  });
}

function toggleList(button: HTMLButtonElement): void {
  const list = button.parentElement?.nextElementSibling as HTMLElement;

  if (list.style.display === 'none') {
    list.style.display = 'block';
    button.innerHTML = '<i class="fa fa-chevron-up toc-chevron"></i>';
  } else {
    list.style.display = 'none';
    button.innerHTML = '<i class="fa fa-chevron-down toc-chevron"></i>';
  }
}

function addClickListenerToButtons(
  fileBrowser: FileBrowser | null,
  docManager: IDocumentManager
) {
  const buttons = document.querySelectorAll('.toc-button');
  buttons.forEach(button => {
    button.addEventListener('click', (event: Event) => {
      console.log('Button clicked');

      if (!fileBrowser) {
        console.error('File browser not found');
        return;
      }

      const toc_div = button.closest('.jbook-toc');
      if (!toc_div) {
        console.error('jbook-toc div not found');
        return;
      }

      const toc_dir = toc_div.getAttribute('data-toc-dir');
      if (typeof toc_dir !== 'string') {
        console.error('data-toc-dir attribute loaded');
        return;
      }

      if (typeof fileBrowser.model.path !== 'string') {
        console.error(
          `Invalid path: The current path is either not set or not a string. Path: ${fileBrowser.model.path}`
        );
        return;
      }
      console.log(`Current directory: ${fileBrowser.model.path}`);

      const filePath = button.getAttribute('data-file-path');
      if (typeof filePath === 'string') {
        if (filePath.includes('.md')) {
          docManager.openOrReveal(filePath, 'Markdown Preview');
        } else {
          docManager.openOrReveal(filePath);
        }
      }
    });
  });
}
