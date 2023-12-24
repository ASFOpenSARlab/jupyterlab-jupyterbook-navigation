import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from "@jupyterlab/application";
import { requestAPI } from "./handler";
import { Widget } from "@lumino/widgets";

import { FileBrowser } from "@jupyterlab/filebrowser";

import { IDocumentManager } from "@jupyterlab/docmanager";
import { IFileBrowserFactory } from "@jupyterlab/filebrowser";

const plugin: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab-jupyterbook-navigation:plugin",
  description:
    "A JupyterLab extension that mimics jupyter-book chapter navigation on an un-built, cloned jupyter book in JupyterLab.",
  autoStart: true,
  requires: [ILabShell, IFileBrowserFactory, IDocumentManager],
  activate: async (
    app: JupyterFrontEnd,
    shell: ILabShell,
    fileBrowserFactory: IFileBrowserFactory,
    docManager: IDocumentManager
  ) => {
    console.log(
      "JupyterLab extension jupyterlab-jupyterbook-navigation is activated!"
    );

    // Create the widget only once
    const widget = new Widget();
    widget.id = "@jupyterlab-sidepanel/jupyterbook-toc";
    // widget.title.iconClass = 'jp-NotebookIcon jp-SideBar-tabIcon';
    widget.title.iconClass = "jbook-icon jp-SideBar-tabIcon";
    widget.title.className = "jbook-tab";
    widget.title.caption = "Jupyter-Book Table of Contents";

    const summary = document.createElement("p");
    widget.node.appendChild(summary);

    // Attach the `activate` event handler to the widget
    widget.activate = async () => {
      console.debug("Widget shown");

      // Get the primary file browser used in JupyterLab
      const fileBrowser = fileBrowserFactory.tracker.currentWidget;

      // Check if the file browser is available and log if it's not
      if (!fileBrowser) {
        console.debug("File browser widget is null.");
      } else {
        console.debug("Active file browser widget found.");
      }

      // Make the API request and update the widget's content
      try {
        const data = await requestAPI<any>("get-toc", fileBrowser?.model.path);
        console.log(data);
        summary.innerHTML = data["data"];
        // Add the button event listener after the widget's content is updated
        addClickListenerToButtons(fileBrowser, docManager);
        addClickListenerToChevron();
      } catch (reason) {
        console.error(
          `The jupyterlab_jupyterbook_navigation server extension appears to be missing.\n${reason}`
        );
      }
    };

    // Add the widget to the sidebar
    shell.add(widget, "left", { rank: 400 });

    widget.activate();
  }
};

export default plugin;

function addClickListenerToChevron() {
  const buttons = document.querySelectorAll(".toc-chevron");
  buttons.forEach(buttonElement => {
    // Perform a type assertion here
    const button = buttonElement as HTMLButtonElement;
    button.addEventListener("click", (event: Event) => {
      console.log(`Button clicked`);
      toggleList(button);
    });
  });
}

function toggleList(button: HTMLButtonElement): void {
  const list = button.parentElement?.nextElementSibling as HTMLElement; // Type assertion for HTMLElement

  if (list.style.display === "none") {
    list.style.display = "block";
    button.innerHTML = '<i class="fa fa-chevron-up toc-chevron"></i>';
  } else {
    list.style.display = "none";
    button.innerHTML = '<i class="fa fa-chevron-down toc-chevron"></i>';
  }
}

function addClickListenerToButtons(
  fileBrowser: FileBrowser | null,
  docManager: IDocumentManager
) {
  const buttons = document.querySelectorAll(".toc-button");
  buttons.forEach(button => {
    button.addEventListener("click", (event: Event) => {
      console.log(`Button clicked`);

      // Check if the file browser is available
      if (!fileBrowser) {
        console.error("File browser is not available.");
        return;
      }

      // Check if the file browser's path is a valid string
      if (typeof fileBrowser.model.path !== "string") {
        console.error(
          `Invalid path: The current path is either not set or not a string. Path: ${fileBrowser.model.path}`
        );
        return;
      }
      // If all checks pass, log the current directory
      console.log(`Current directory: ${fileBrowser.model.path}`);
      const browser_path = fileBrowser.model.path;

      const filePath = button.getAttribute("data-file-path");
      if (typeof filePath === "string") {
        if (filePath.includes(".md")) {
          docManager.openOrReveal(
            browser_path + "/" + filePath,
            "Markdown Preview"
          );
        } else {
          docManager.openOrReveal(browser_path + "/" + filePath);
        }
      }
    });
  });
}
