import * as path from 'path';
import * as yaml from 'js-yaml';
import { getJupyterAppInstance } from './index';

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

async function getFileContents(path: string): Promise<string> {
  try {
    const app = getJupyterAppInstance();
    const data = await app.serviceManager.contents.get(path, { content: true });
    if (data.type === 'notebook' || data.type === 'file') {
      return data.content as string;
    } else {
      throw new Error(`Unsupported file type: ${data.type}`);
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
        const headerCells = jsonData.cells.filter(cell => {
          if (cell.cell_type === 'markdown') {
            const source = Array.isArray(cell.source)
              ? cell.source.join('')
              : cell.source;
            return source.split('\n').some(line => line.startsWith('# '));
          }
          return false;
        });

        const firstHeaderCell = headerCells.length > 0 ? headerCells[0] : null;
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
  return obj && typeof obj === 'object' && obj.title && obj.author;
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

async function ls(pth: string): Promise<any> {
  if (pth === '') {
    pth = '/';
  }

  try {
    const app = getJupyterAppInstance();
    const data = await app.serviceManager.contents.get(pth, { content: true });
    return data;
  } catch (error) {
    console.error('Error listing directory contents:', error);
    return null;
  }
}

async function globFiles(pattern: string): Promise<string[]> {
  const baseDir = '';
  const result: string[] = [];

  try {
    const app = getJupyterAppInstance();
    const data = await app.serviceManager.contents.get(baseDir, {
      content: true
    });
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

async function findTOCinParents(cwd: string): Promise<string | null> {
  const dirs = cwd.split('/');
  const tocPattern: string = '_toc.yml';
  let counter: number = 0;
  while (counter < 1) {
    const pth = dirs.join('/');
    const files = await ls(pth);
    for (const value of Object.values(files.content)) {
      const file = value as IFileMetadata;

      if (file.path.includes(tocPattern)) {
        return file.path;
      }
    }
    if (dirs.length === 0) {
      counter += 1;
    } else {
      dirs.pop();
    }
  }
  return null;
}

async function getFullPath(file_pattern: string, dir_pth: string) {
  const files = await ls(dir_pth);
  for (const value of Object.values(files.content)) {
    const file = value as IFileMetadata;
    if (file.path.includes(file_pattern)) {
      return file.path;
    }
  }
  return `Unable to locate ${file_pattern} in ${dir_pth}`;
}

async function getSubSection(
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
    const pth = await getFullPath(file, `${cwd}${k_dir}`);
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
      const pth = await getFullPath(k.file, `${cwd}${k_dir}`);
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
        k.sections,
        cwd,
        (level = level + 1),
        (html = html_cur)
      );
      level = level - 1;
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

async function tocToHtml(toc: IToc, cwd: string): Promise<string> {
  let html = '\n<ul>';
  if (toc.parts) {
    for (const chapter of toc.parts) {
      html += `\n<p class="caption" role="heading"><span class="caption-text"><b>\n${chapter.caption}\n</b></span>\n</p>`;
      const subISectionHtml = await getSubSection(chapter.chapters, cwd);
      html += `\n${subISectionHtml}`;
    }
  } else {
    if (toc.chapters) {
      const subISectionHtml = await getSubSection(toc.chapters, cwd);
      html += `\n${subISectionHtml}`;
    }
  }
  html += '\n</ul>';
  return html;
}

export async function getTOC(cwd: string): Promise<string> {
  const tocPath = await findTOCinParents(cwd);
  let configPath = null;
  let configParent = null;
  if (tocPath) {
    const parts = tocPath.split('/');
    parts.pop();
    configParent = parts.join('/');
    const files = await ls(configParent);
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
        const toc_html = await tocToHtml(toc, configParent);
        return `
          <div class="jbook-toc" data-toc-dir="${configParent}"><p id="toc-title">${config.title}</p>
          <p id="toc-author">Author: ${config.author}</p>
          ${toc_html} </div>
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
