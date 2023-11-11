import json
from pathlib import Path

from sphinx_external_toc.parsing import parse_toc_yaml

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from jupyter_server.services.contents.filemanager import FileContentsManager

import tornado

from IPython.core.display_functions import display


def get_current_working_directory(current_URL):
    fcm = FileContentsManager()
    cwd = fcm.root_dir

    if 'tree' in current_URL:
        subfolder = current_URL.split('/tree/')[1]
        if not Path(subfolder).is_dir:
            subfolder = str(Path(subfolder).parent)
    else:
        subfolder = ''

    cwd = f"{cwd}/{subfolder}"
    return cwd


def get_title(file_pth):
    file_pth = Path("ASF_SAR_Data_Recipes")/file_pth

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


def toc_to_html(toc, cwd):
    """
    Builds a Jupyter-Book Table of Contents as an unordered HTML list.
    Links to source files for viewing in JupyterLab (not a built html book)

    TODO: add ordered list support for numbered TOCs
    """
    html = f"{toc.root.docname} <ul>"
    for tree in toc.root.subtrees:
        html = f"{html} <li>{tree.caption}</li><ul>"
        for i, branch in enumerate(tree.items):
            # relative_path = (Path(cwd)/branch).relative_to(Path.cwd())
            title = get_title(branch)
            if title:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{i}">{title}</button></li>'
            else:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{i}">{branch}</button></li>'
            if len(toc[branch].subtrees) > 0:
                html = f"{html} <ul>"
                for twig in toc[branch].subtrees:
                    for j, leaf in enumerate(twig.items):
                        # relative_path = (Path(cwd)/leaf).relative_to(Path.cwd())
                        title = get_title(leaf)
                        if title:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{i+j+100}">{title}</button></li>'
                        else:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{i+j+100}">{leaf}</button></li>'
                html = f"{html} </ul>"
        html = f"{html} </ul>"
    html = f"{html} </ul>"
    return html 

# def toc_to_html(toc, cwd):
#     """
#     Builds a Jupyter-Book Table of Contents as an unordered HTML list.
#     Links to source files for viewing in JupyterLab (not a built html book)

#     TODO: add ordered list support for numbered TOCs
#     """
#     html = f"{toc.root.docname} <ul>"
#     for tree in toc.root.subtrees:
#         html = f"{html} <li>{tree.caption}</li><ul>"
#         for branch in tree.items:
#             relative_path = (Path(cwd)/branch).relative_to(Path.cwd())
#             title = get_title(branch)
#             if title:
#                 html = f'{html} <li><a href={relative_path}>{title}</a></li>'
#             else:
#                 html = f'{html} <li><a href={relative_path}>{branch}</a></li>'
#             if len(toc[branch].subtrees) > 0:
#                 html = f"{html} <ul>"
#                 for twig in toc[branch].subtrees:
#                     for leaf in twig.items:
#                         relative_path = (Path(cwd)/leaf).relative_to(Path.cwd())
#                         title = get_title(leaf)
#                         if title:
#                             html = f'{html} <li><a href={relative_path}>{title}</a></li>'
#                         else:
#                             html = f'{html} <li><a href={relative_path}>{leaf}</a></li>'
#                 html = f"{html} </ul>"
#         html = f"{html} </ul>"
#     html = f"{html} </ul>"
#     return html 


class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        current_URL = self.get_argument('current_URL', default=None)

        cwd = get_current_working_directory(current_URL)

        toc_pth = list(Path(cwd).glob('_toc.yml'))
        if len(toc_pth) > 0:
            toc_pth = str(toc_pth[0])
            toc = parse_toc_yaml(toc_pth)
            # html_toc = toc_to_html(toc, current_URL)
            html_toc = toc_to_html(toc, cwd)
            # html_toc = toc_to_html(toc)
        else:
            toc_pth = f"Not a Jupyter-Book: _toc.yml not found in {Path.cwd()}"
            html_toc = f"<p>{toc_pth}</p>"


        self.finish(json.dumps({
            "data": str(html_toc),
            "cwd": cwd,
            "current_URL": str(current_URL)
        }))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "jlab-jbook-chapter-navigation", "get-toc")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
