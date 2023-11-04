import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jlab-jbook-chapter-navigation extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jlab-jbook-chapter-navigation:plugin',
  description: 'A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jlab-jbook-chapter-navigation is activated!');
  }
};

export default plugin;
