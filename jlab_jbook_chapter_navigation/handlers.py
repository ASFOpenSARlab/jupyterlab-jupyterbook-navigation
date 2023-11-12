import json
from pathlib import Path
import yaml

from sphinx_external_toc.parsing import parse_toc_yaml

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from jupyter_server.services.contents.filemanager import FileContentsManager

import tornado

from IPython.core.display_functions import display


def get_title(file_pth):
#     file_pth = Path(file_pth)
    file_pth = Path(file_pth)

    if file_pth.suffix == '.ipynb':
        f = open(file_pth)
        data = json.load(f)
        for i in data['cells']:
            if i['cell_type'] == 'markdown' and i['source'][0][:2] == '# ':
                return i['source'][0][2:].strip()
        f.close()
    elif file_pth.suffix == '.md':
        with open(file_pth, 'r') as f:
            lines = f.readlines()
            for line in lines:
                if line[:2] == '# ':
                    return line[2:].strip()
                
def get_book_title(config_pth):
    
    try:
        with open(config_pth, 'r') as f:
            data = yaml.load(f, Loader=yaml.SafeLoader)
        return data['title']
    except Exception as e:
        return f'Exception: {e}'

def toc_to_html(toc, cwd):
    """
    Builds a Jupyter-Book Table of Contents as an unordered HTML list.
    Links to source files for viewing in JupyterLab (not a built html book)

    TODO: add ordered list support for numbered TOCs
    """
    cwd = Path(cwd)
    html = f"<ul>"
    for i, tree in enumerate(toc.root.subtrees):
        html = f"{html} <li><b>{tree.caption}</b></li><ul>"
        for j, branch in enumerate(tree.items):
            title = get_title(cwd/branch)
            if title:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)}">{title}</button></li>'
            else:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)}">{branch}</button></li>'
            if len(toc[branch].subtrees) > 0:
                html = f"{html} <ul>"
                for twig in toc[branch].subtrees:
                    for k, leaf in enumerate(twig.items):
                        title = get_title(cwd/leaf)
                        if title:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)+k+1}">{title}</button></li>'
                        else:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)+k+1}">{leaf}</button></li>'
                html = f"{html} </ul>"
        html = f"{html} </ul>"
    html = f"{html} </ul>"
    return html 


class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        browser_dir = self.get_argument('current_URL', default=None)

        fcm = FileContentsManager()
        cwd = f"{fcm.root_dir}/{browser_dir}"

        toc_pth = list(Path(cwd).glob('_toc.yml'))
        config_pth = list(Path(cwd).glob('_config.yml'))
        if len(toc_pth) > 0:
            toc_pth = str(toc_pth[0])
            toc = parse_toc_yaml(toc_pth)
            html_toc = f'<p id="toc_title">{str(get_book_title(config_pth[0]))}</p>'
            html_toc = f"{html_toc} {toc_to_html(toc, cwd)}"

        else:
            toc_pth = f"Not a Jupyter-Book: _toc.yml not found in {Path.cwd()}"
            html_toc = f'<p id="toc_title">Not a Jupyter-Book: _toc.yml not found in {Path.cwd()}</p>'

        self.finish(json.dumps({
            "data": str(html_toc),
            "cwd": cwd,
            "current_URL": browser_dir
        }))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "jlab-jbook-chapter-navigation", "get-toc")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
