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

import { ServerConnection } from "@jupyterlab/services"
import * as path from 'path';
import * as yaml from 'js-yaml';


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

        let cwd = fileBrowser?.model.path;
        if (typeof cwd == 'string') {
          let toc = await getTOC(cwd);
          summary.innerHTML = toc;
        }

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

function combinePaths(fullPath: string, relativePath: string): string {
  const fullPathSegments = fullPath.split("/");
  const relativePathSegments = relativePath.split("/");

  let firstCommonSegmentIndex = -1;
  for (const segment of relativePathSegments) {
    const index = fullPathSegments.indexOf(segment);
    if (index !== -1) {
      firstCommonSegmentIndex = index;
      break;
    }
  }
  if (firstCommonSegmentIndex === -1) {
    return "";
  }

  const reconstructedPath = fullPathSegments
    .slice(firstCommonSegmentIndex)
    .join("/");
  return reconstructedPath;
}

function addClickListenerToButtons(
  fileBrowser: FileBrowser | null,
  docManager: IDocumentManager
) {
  const buttons = document.querySelectorAll(".toc-button");
  buttons.forEach(button => {
    button.addEventListener("click", (event: Event) => {
      console.log(`Button clicked`);

      if (!fileBrowser) {
        console.error("File browser not found");
        return;
      }

      const toc_div = button.closest(".jbook-toc");
      if (!toc_div) {
        console.error("jbook-toc div not found");
        return;
      }

      const toc_dir = toc_div.getAttribute("data-toc-dir");
      if (typeof toc_dir !== "string") {
        console.error(`data-toc-dir attribute loaded`);
        return;
      }

      if (typeof fileBrowser.model.path !== "string") {
        console.error(
          `Invalid path: The current path is either not set or not a string. Path: ${fileBrowser.model.path}`
        );
        return;
      }
      console.log(`Current directory: ${fileBrowser.model.path}`);
      const browser_path = fileBrowser.model.path;

      const filePath = button.getAttribute("data-file-path");
      if (typeof filePath === "string") {
        const relativePath = combinePaths(toc_dir, browser_path);

        if (filePath.includes(".md")) {
          docManager.openOrReveal(
            relativePath + "/" + filePath,
            "Markdown Preview"
          );
        } else {
          docManager.openOrReveal(relativePath + "/" + filePath);
        }
        // getTitle(relativePath + "/" + filePath);  // TODO: REMOVE
        // getBookConfig(relativePath + "/_config.yml");
        // ls(relativePath);
        // findTOCinParents(relativePath);
      }
    });
  });
}

// Ported from Python below

async function getFileContents(path: string): Promise<Notebook | string> {
  const serverSettings = ServerConnection.makeSettings();

  const url = new URL(path, serverSettings.baseUrl + 'api/contents/').href;

  let response: Response;

  try {
    // Make the request to the Jupyter server
    response = await ServerConnection.makeRequest(url, {}, serverSettings);
  } catch (error) {
    console.error(`Failed to get file: ${error}`);
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to get file: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content;
}

interface Notebook {
  cells: Cell[];
}

interface Cell {
  cell_type: 'markdown';
  metadata: {};
  source: string;
}

function isNotebook(obj: any): obj is Notebook {
  return obj && typeof obj === 'object' && Array.isArray(obj.cells);
}

async function getTitle(filePath: string): Promise<string|null> {
  const suffix = path.extname(filePath);

  console.log("suffix: ", suffix);
  console.log("filePath: ", filePath);

  if (suffix === '.ipynb') {
    try {
      const jsonData: Notebook | string = await getFileContents(filePath);
      if (isNotebook(jsonData)) {
        const firstHeaderCell = jsonData.cells.find(cell => cell.cell_type === 'markdown');
        if (firstHeaderCell) {
          if (firstHeaderCell.source.split("\n")[0].slice(0,2) === '# ') {
            const title: string  = firstHeaderCell.source.split("\n")[0].slice(2);
            console.log(title);
            return title;
          }
        }
      }
    } catch (error) {
      console.error('Error reading or parsing notebook:', error);
  }
} else if (suffix === '.md') {
    try {
      const md: Notebook | string = await getFileContents(filePath);    
      if (!isNotebook(md)) {
        const lines: string[] = md.split("\n");
        for (let line of lines) {
          if (line.slice(0,2) == '# ') {
            return line.slice(2);
          }
      }
      }
    } catch (error) {
      console.error('Error reading or parsing Markdown:', error);
  }
}
return null;
}

interface jbookConfig {
  title: string;
  author: string;
  logo: string;
}

function isJbookConfig(obj: any): obj is jbookConfig {
  return obj && 
  typeof obj === 'object' && 
  obj.title &&
  obj.author &&
  obj.logo;
}

// async function getBookTitle(configPath: string): Promise<string|null> {
//   try {
//     const yamlStr = await getFileContents(configPath);

//     if (typeof yamlStr === "string") {
//       const config: unknown = yaml.load(yamlStr);
//       if (isJbookConfig(config)) {
//         return config.title || "Untitled Jupyter Book";
//       } else {
//         console.error("Error: Misconfigured Jupyter Book config.");
//       }
//     }
//   } catch (error) {
//     console.error('Error reading or parsing config:', error);
//   }
//   return null;
// }

// async function getAuthor(configPath: string): Promise<string|null> {
//   try {
//     const yamlStr = await getFileContents(configPath);

//     if (typeof yamlStr === "string") {
//       const config: unknown = yaml.load(yamlStr);
//       if (isJbookConfig(config)) {
//         console.log(config.author || "Anonymous");
//         return config.author || "Anonymous";
//       } else {
//         console.error("Error: Misconfigured Jupyter Book config.");
//       }
//     }
//   } catch (error) {
//     console.error('Error reading or parsing config:', error);
//   }
//   return null;
// }

async function getBookConfig(configPath: string): Promise<{title: string|null, author: string|null}> {
  try {
    const yamlStr = await getFileContents(configPath);
    if (typeof yamlStr === "string") {
      const config: unknown = yaml.load(yamlStr);
      if (isJbookConfig(config)) {
        const title = config.title || "Untitled Jupyter Book";
        const author = config.author || "Anonymous";
        return { title, author };
      } else {
        console.error("Error: Misconfigured Jupyter Book config.");
      }
    }
  } catch (error) {
    console.error('Error reading or parsing config:', error);
  }
  return { title: null, author: null };
}

async function ls(pth: string): Promise<any> {
  const baseUrl = '/api/contents/';
  const fullPath = `${baseUrl}${pth}?content=1`;

  try {
    const response = await fetch(fullPath, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log(data);
    return data;
  } catch (error) {
    console.error("Error listing directory contents:", error);
    return null;
  }
}

interface FileMetadata {
  path: string;
}

async function findTOCinParents(cwd: string): Promise<string|null> {
  let dirs = cwd.split('/');
  const tocPattern: string = "_toc.yml";
  while (dirs.length > 0) {
    const pth = dirs.join('/');
    const files = await ls(pth);
    for (let value of Object.values(files.content)) {
      const file = value as FileMetadata;

      console.log("file.path", file.path);

      if (file.path.includes(tocPattern)) {
        console.log("TOC path:", file.path);
        return file.path;
      }
    }
    dirs.pop();
  }
  return null;
}

async function getFullPath(file_pattern: string, dir_pth: string) {
  let files = await ls(dir_pth);
  for (let value of Object.values(files.content)) {
    const file = value as FileMetadata;
    if (file.path.includes(file_pattern)) {
      // console.log("Suffix Path:", file.path);
      return file.path;
    }
  }
  return `Unable to locate ${file_pattern} in ${dir_pth}`

}

interface Section {
  sections?: Section[];
  file?: string;
  url?: string;
  title?: string;
  glob?: string;
}

interface Toc {
  parts?: Part[];
  chapters?: Section[]; // Assuming Section is the same type used in getSubSection
  caption?: string;
}

interface Part {
  caption: string;
  chapters: Section[];
}

// async function getSubSection(parts: Section[], cwd: string, level: number = 1, html: string = ""): Promise<string> {
//   for (const k of parts) {
//     // if (typeof k !== 'object') {
//     //   return html;
//     // }
    
//     if (k.sections) {

      
//       console.log("k.sections: ", k.sections);

//       const files = await ls(cwd);
//       for (let value of Object.values(files.content)) {
//         const file = value as FileMetadata;

//         console.log("file.path: ", file.path);
//         console.log("k.file: ", k.file);

//         if (k.file && file.path.includes(k.file)) {
//           const title = await getTitle(file.path);
//           html += `
//             <div>
//               <button class="jp-Button toc-button tb-level${level}" style="display: inline-block;" data-file-path="${file.path}">${title}</button>
//               <button class="jp-Button toc-chevron" style="display: inline-block;"><i class="fa fa-chevron-down "></i></button>
//             </div>
//             <div style="display: none;">
//           `;

//           html = await getSubSection(k.sections, cwd, level + 1, html);
//           html += `\n</div>`;
//           break;
//         }
//       }
//     } else if (k.file) {

//       console.log("k.file: ", k.file);      

//       const files = await ls(cwd);
//       for (let value of Object.values(files.content)) {
//         const file = value as FileMetadata;
//         if (file.path.includes(k.file)) {
//           const title = await getTitle(file.path);
//           html += ` <button class="jp-Button toc-button tb-level${level}" style="display: block;" data-file-path="${file.path}">${title}</button>`;
//           break;
//         }
//       }
//     } else if (k.url) {
//       html += ` <a class="toc-link tb-level${level}" href="${k.url}" target="_blank" rel="noopener noreferrer" style="display: block;">${k.title}</a>`;
//      } // else if (k.glob) {
//     //   // TODO: support Jupyter Book globbing
//     // }
//   }
//   return html;
// }

async function getSubSection(parts: Section[], cwd: string, level: number = 1, html: string = ""): Promise<string> {
  for (const k of parts) {
    // if (typeof k !== 'object') {
    //   return html;
    // }
  

    if (k.sections && k.file) {

      const parts = k.file.split('/');
      parts.pop();
      const k_dir = parts.join('/');
      const pth = await getFullPath(k.file, `${cwd}/${k_dir}`);
      let title = await getTitle(pth);
      if (!title) {
        title = k.file;
      }
      html += `
      <div>
          <button class="jp-Button toc-button tb-level${level}"style="display: inline-block;" data-file-path="${pth}">${title}</button>
          <button class="jp-Button toc-chevron" style="display: inline-block;"><i class="fa fa-chevron-down "></i></button>
      </div>
      <div style="display: none;">
      `

      html = await getSubSection(k.sections, cwd, level=level+1, html=html);
      html += `</div>`
    } else if (k.file) {
      const parts = k.file.split('/');
      parts.pop();
      const k_dir = parts.join('/');
      const pth = await getFullPath(k.file, `${cwd}/${k_dir}`);
      let title = await getTitle(pth);
      if (!title) {
        title = k.file;
      }
      html += `<button class="jp-Button toc-button tb-level${level}" style="display: block;" data-file-path="${pth}">${title}</button>`
    } else if (k.url) {
      html += ` <a class="toc-link tb-level${level}" href="${k.url}" target="_blank" rel="noopener noreferrer" style="display: block;">${k.title}</a>`;

    } // else if (k.glob) {
      //   // TODO: support Jupyter Book globbing
      // }
  }
    return html;
  }


async function tocToHtml(toc: Toc, cwd: string): Promise<string> {
  let html = "\n<ul>";

  console.log("toc in tocToHtml: ", toc);

  if (toc.parts) {

    for (const chapter of toc.parts) {

      console.log("chapter: ", chapter);

      html += `\n<p class="caption" role="heading"><span class="caption-text"><b>\n${chapter.caption}\n</b></span>\n</p>`;
      const subSectionHtml = await getSubSection(chapter.chapters, cwd);
      html += `\n${subSectionHtml}`;
    }
  } else {
    if (toc.chapters) {
      const subSectionHtml = await getSubSection(toc.chapters, cwd);
      html += `\n${subSectionHtml}`;
    }
  }

  html += "\n</ul>";
  return html;
}



async function getTOC(cwd: string): Promise<string> {
  const tocPath = await findTOCinParents(cwd);
  let configPath = null;
  let configParent = null;
  if (tocPath) {
    const parts = tocPath.split('/');
    parts.pop();
    configParent = parts.join('/');
    let files = await ls(configParent);
    const configPattern = "_config.yml";
    for (let value of Object.values(files.content)) {
      const file = value as FileMetadata;
      if (file.path.includes(configPattern)) {
        configPath = file.path;
        break;
      }
    }
  }
  if (tocPath && configParent && configPath) {


    try {
      const tocYamlStr = await getFileContents(tocPath);
      if (typeof tocYamlStr === "string") {
        const tocYaml: unknown = yaml.load(tocYamlStr);
        const toc = tocYaml as Toc;
        console.log("toc in getToc: ", toc);
        const config = await getBookConfig(configPath);
        const toc_html = await tocToHtml(toc, configParent);
        return `
        <div class="jbook-toc" data-toc-dir="${configParent}"><p id="toc-title">${config.title}</p>
        <p id="toc-author">Author: ${config.author}</p>
        ${toc_html} </div>"
          `
      } else {
        console.error("Error: Misconfigured Jupyter Book _toc.yml.");
      }
    } catch (error) {
      console.error('Error reading or parsing _toc.yml:', error);
    }
  }
  return `
  <p id="toc-title">Not a Jupyter-Book</p>
  <p id="toc-author">"_toc.yml" and/or "_config.yml" not found in or above:</p>
  <p id="toc-author">${cwd}</p>
  <p id="toc-author">Please navigate to a directory containing a Jupyter-Book to view its Table of Contents</p>
  `;
}
