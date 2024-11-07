import { ContentsManager, ServerConnection } from '@jupyterlab/services';
import { JupyterFrontEnd } from '@jupyterlab/application';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface IFileMetadata {
  path: string;
}

interface IJbookConfig {
  title: string;
  author: string;
  logo: string;
}

interface IToc {
  parts?: IPart[];
  chapters?: ISection[];
  caption?: string;
}

interface ISection {
  sections?: ISection[];
  file?: string;
  url?: string;
  title?: string;
  glob?: string;
}

interface IPart {
  caption: string;
  chapters: ISection[];
}

interface INotebook {
  cells: ICell[];
}

interface ICell {
  cell_type: 'markdown';
  metadata: { object: any };
  source: string;
}

// async function getFileContents(path: string): Promise<INotebook | string> {
//   const serverSettings = ServerConnection.makeSettings();

//   const url = new URL(path, serverSettings.baseUrl + 'api/contents/').href;

//   let response: Response;

//   try {
//     response = await ServerConnection.makeRequest(url, {}, serverSettings);
//   } catch (error) {
//     console.error(`Failed to get file: ${error}`);
//     throw error;
//   }

//   if (!response.ok) {
//     throw new Error(`Failed to get file: ${response.statusText}`);
//   }

//   const data = await response.json();
//   return data.content;
// }

async function getFileContents(path: string): Promise<string> {
  const serverSettings = ServerConnection.makeSettings();
  const contentsManager = new ContentsManager({ serverSettings });

  try {
    const file = await contentsManager.get(path, { content: true });
    
    if (file.type === 'notebook' || file.type === 'file') {
      return file.content as string;
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error(`Failed to get file contents for ${path}:`, error);
    throw error;
  }
}

function isNotebook(obj: any): obj is INotebook {
  return obj && typeof obj === 'object' && Array.isArray(obj.cells);
}

async function getTitle(filePath: string): Promise<string | null> {
  const suffix = path.extname(filePath);
  if (suffix === '.ipynb') {
    try {
      const jsonData: INotebook | string = await getFileContents(filePath);
      if (isNotebook(jsonData)) {
        const firstHeaderCell = jsonData.cells.find(
          cell => cell.cell_type === 'markdown'
        );
        if (firstHeaderCell) {
          if (firstHeaderCell.source.split('\n')[0].slice(0, 2) === '# ') {
            const title: string = firstHeaderCell.source
              .split('\n')[0]
              .slice(2);
            return title;
          }
        }
      }
    } catch (error) {
      console.error('Error reading or parsing notebook:', error);
    }
  } else if (suffix === '.md') {
    try {
      const md: INotebook | string = await getFileContents(filePath);
      if (!isNotebook(md)) {
        const lines: string[] = md.split('\n');
        for (const line of lines) {
          if (line.slice(0, 2) === '# ') {
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

function isIJbookConfig(obj: any): obj is IJbookConfig {
  return obj && typeof obj === 'object' && obj.title && obj.author && obj.logo;
}

async function getBookConfig(
  configPath: string
): Promise<{ title: string | null; author: string | null }> {
  try {
    const yamlStr = await getFileContents(configPath);
    if (typeof yamlStr === 'string') {
      const config: unknown = yaml.load(yamlStr);
      if (isIJbookConfig(config)) {
        const title = config.title || 'Untitled Jupyter Book';
        const author = config.author || 'Anonymous';
        return { title, author };
      } else {
        console.error('Error: Misconfigured Jupyter Book config.');
      }
    }
  } catch (error) {
    console.error('Error reading or parsing config:', error);
  }
  return { title: null, author: null };
}

// function getBaseUrl() {
//   const origin = window.location.origin;
//   const pathSegment = window.location.pathname.split('/');
//   // Remove empty strings
//   const filteredSegments = pathSegment.filter(part => part !== '');
//   const labIndex = filteredSegments.lastIndexOf('lab');
//   // If 'lab' not in path, use the entire path, else slice up to last instance of 'lab'
//   const segments =
//     labIndex !== -1
//       ? filteredSegments.slice(0, labIndex).join('/')
//       : filteredSegments.join('/');
//   return segments ? `${origin}/${segments}` : origin;
// }

// async function ls(pth: string): Promise<any> {
//   const baseUrl = getBaseUrl();
//   const fullPath = `${baseUrl}/api/contents/${pth}?content=1`;
//   try {
//     const response = await fetch(fullPath, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error listing directory contents:', error);
//     return null;
//   }
// }


async function ls(app: JupyterFrontEnd, pth: string): Promise<any> {
  const settings = ServerConnection.makeSettings();
  const contentsManager = new ContentsManager({ serverSettings: settings });
  
  console.log("Made it to ls");

  const isJupyterLite = !!navigator.serviceWorker.controller || !!(window as any).JupyterLiteContents || (app as any).isLite === true;

  // if (pth === "") {
  //   pth = "/";
  // }

  try {
    let data;
    if (isJupyterLite) {
      console.log("Attempting to access with JupyterLite content manager:", pth);
      data = await app.serviceManager.contents.get(pth, { content: true });
      console.log("File data from JupyterLite:", data);
    } else {
      console.log("Attempting to access with regular contentsManager:", pth);
      data = await contentsManager.get(pth, { content: true });
      console.log("File data from regular JupyterLab:", data);
    }
    return data;
  } catch (error) {
    console.error("Error listing directory contents:", error);
    return null;
  }
}


// async function globFiles(pattern: string): Promise<any> {
//   const baseUrl = '/api/globbing/';
//   const fullPath = `${baseUrl}${pattern}`;

//   try {
//     const response = await fetch(fullPath, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const files = await response.json();
//     const result = [];
//     for (const file of files) {
//       if (file.type === 'file') {
//         result.push(file.path);
//       }
//     }
//     return result;
//   } catch (error) {
//     console.error(`Error globbing pattern ${pattern}`, error);
//     return [];
//   }
// }

async function globFiles(pattern: string): Promise<string[]> {
  const serverSettings = ServerConnection.makeSettings();
  const contentsManager = new ContentsManager({ serverSettings });

  const baseDir = '';
  const result: string[] = [];

  try {
    console.log("made it to the glob function");
    const data = await contentsManager.get(baseDir, { content: true });
    console.log('Directory Data:', data);
    
    const regex = new RegExp(pattern);
    for (const item of data.content) {
      if (item.type === 'file' && regex.test(item.path)) {
        result.push(item.path);
      }
    }
  } catch (error) {
    console.error(`Error globbing pattern ${pattern}`, error);
  }

  return result;
}

async function findTOCinParents(app: JupyterFrontEnd, cwd: string): Promise<string | null> {
  const dirs = cwd.split('/');

  console.log("Made it to findTOCinParents");
  console.log("dirs:" + dirs);

  const tocPattern: string = '_toc.yml';
  let counter: number = 0;
  while (counter < 1) {
    const pth = dirs.join('/');
    const files = await ls(app, pth);
    for (const value of Object.values(files.content)) {
      const file = value as IFileMetadata;

      if (file.path.includes(tocPattern)) {
        return file.path;
      }
    }
    if (dirs.length == 0) {
      counter += 1;
    }
    else {
      dirs.pop();
    }
  }
  return null;
}

async function getFullPath(app: JupyterFrontEnd, file_pattern: string, dir_pth: string) {
  const files = await ls(app, dir_pth);
  for (const value of Object.values(files.content)) {
    const file = value as IFileMetadata;
    if (file.path.includes(file_pattern)) {
      return file.path;
    }
  }
  return `Unable to locate ${file_pattern} in ${dir_pth}`;
}

async function getSubSection(
  app: JupyterFrontEnd,
  parts: ISection[],
  cwd: string,
  level: number = 1,
  html: string = ''
): Promise<string> {
  if (cwd && cwd.slice(-1) !== '/') {
    cwd = cwd + '/';
  }

  async function insert_one_file(file: string) {
    const parts = file.split('/');
    parts.pop();
    const k_dir = parts.join('/');
    const pth = await getFullPath(app, file, `${cwd}${k_dir}`);
    let title = await getTitle(pth);
    if (!title) {
      title = file;
    }
    html += `<button class="jp-Button toc-button tb-level${level}" style="display: block;" data-file-path="${pth}">${title}</button>`;
  }
  for (const k of parts) {
    if (k.sections && k.file) {
      const parts = k.file.split('/');
      parts.pop();
      const k_dir = parts.join('/');
      const pth = await getFullPath(app, k.file, `${cwd}${k_dir}`);
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
        `;
      const html_cur = html;
      html = await getSubSection(
        app,
        k.sections,
        cwd,
        (level = level + 1),
        (html = html_cur)
      );
      html += '</div>';
    } else if (k.file) {
      await insert_one_file(k.file);
    } else if (k.url) {
      html += `<button class="jp-Button toc-button tb-level${level}" style="display:block;"><a class="toc-link tb-level${level}" href="${k.url}" target="_blank" rel="noopener noreferrer" style="display: block;">${k.title}</a></button>`;
    } else if (k.glob) {
      const files = await globFiles(`${cwd}${k.glob}`);
      for (const file of files) {
        const relative = file.replace(`${cwd}`, '');
        await insert_one_file(relative);
      }
    }
  }
  return html;
}

async function tocToHtml(app: JupyterFrontEnd, toc: IToc, cwd: string): Promise<string> {
  let html = '\n<ul>';
  if (toc.parts) {
    for (const chapter of toc.parts) {
      html += `\n<p class="caption" role="heading"><span class="caption-text"><b>\n${chapter.caption}\n</b></span>\n</p>`;
      const subISectionHtml = await getSubSection(app, chapter.chapters, cwd);
      html += `\n${subISectionHtml}`;
    }
  } else {
    if (toc.chapters) {
      const subISectionHtml = await getSubSection(app, toc.chapters, cwd);
      html += `\n${subISectionHtml}`;
    }
  }

  html += '\n</ul>';
  return html;
}

export async function getTOC(app: JupyterFrontEnd, cwd: string): Promise<string> {

  console.log("Made it to getTOC");

  const tocPath = await findTOCinParents(app, cwd);

  console.log("made it past findTOCinParents");

  let configPath = null;
  let configParent = null;
  if (tocPath) {
    const parts = tocPath.split('/');

    parts.pop();
    configParent = parts.join('/');

    const files = await ls(app, configParent);

    const configPattern = '_config.yml';
    for (const value of Object.values(files.content)) {
      const file = value as IFileMetadata;
      if (file.path.includes(configPattern)) {
        configPath = file.path;
        break;
      }
    }
  }

  if (
    tocPath &&
    configParent !== null &&
    configParent !== undefined &&
    configPath
  ) {
    try {
      const tocYamlStr = await getFileContents(tocPath);
      if (typeof tocYamlStr === 'string') {
        const tocYaml: unknown = yaml.load(tocYamlStr);
        const toc = tocYaml as IToc;
        const config = await getBookConfig(configPath);
        const toc_html = await tocToHtml(app, toc, configParent);
        return `
          <div class="jbook-toc" data-toc-dir="${configParent}"><p id="toc-title">${config.title}</p>
          <p id="toc-author">Author: ${config.author}</p>
          ${toc_html} </div>"
            `;
      } else {
        console.error('Error: Misconfigured Jupyter Book _toc.yml.');
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
