import json
from pathlib import Path

from sphinx_external_toc.parsing import parse_toc_yaml

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

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


def toc_to_html(toc):
    html = f"{toc.root.docname} <ul>"
    for tree in toc.root.subtrees:
        html = f"{html} <li>{tree.caption}</li><ul>"
        for item in tree.items:
            title = get_title(item)
            if title:
                html = f'{html} <li><a href={item} target="_blank">{title}</a></li>'
            else:
                html = f'{html} <li><a href={item} target="_blank">{item}</a></li>'
            if len(toc[item].subtrees) > 0:
                html = f"{html} <ul>"
                for treee in toc[item].subtrees:
                    for itemm in treee.items:
                        title = get_title(itemm)
                        if title:
                            html = f'{html} <li><a href={itemm} target="_blank">{title}</a></li>'
                        else:
                            html = f'{html} <li><a href={itemm} target="_blank">{itemm}</a></li>'
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
        toc_pth = list((Path.cwd()/"ASF_SAR_Data_Recipes").glob('_toc.yml'))
        if len(toc_pth) > 0:
            toc_pth = str(toc_pth[0])
        else:
            toc_pth = f"_toc.yml not found in {Path.cwd()}"
        toc = parse_toc_yaml(toc_pth)
        html_toc = toc_to_html(toc)
        self.finish(json.dumps({
            "data": str(html_toc),
            "cwd": str(Path.cwd())
        }))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "jlab-jbook-chapter-navigation", "get-example")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
