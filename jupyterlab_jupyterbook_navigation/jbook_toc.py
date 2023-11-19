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
    file_pth = Path(file_pth)

    if file_pth.suffix == ".ipynb":
        f = open(file_pth)
        data = json.load(f)
        for i in data["cells"]:
            if i["cell_type"] == "markdown" and i["source"][0][:2] == "# ":
                return i["source"][0][2:].strip()
        f.close()
    elif file_pth.suffix == ".md":
        with open(file_pth, "r") as f:
            lines = f.readlines()
            for line in lines:
                if line[:2] == "# ":
                    return line[2:].strip()


def get_book_title(config_pth):
    try:
        with open(config_pth, "r") as f:
            data = yaml.load(f, Loader=yaml.SafeLoader)
        return data["title"]
    except Exception as e:
        return f"Exception: {e}"


def get_author(config_pth):
    try:
        with open(config_pth, "r") as f:
            data = yaml.load(f, Loader=yaml.SafeLoader)
        return data["author"]
    except Exception as e:
        return f"Exception: {e}"


def get_suffix_pth(perhaps_suffixless_pth):
    if Path(perhaps_suffixless_pth).suffix != "":
        return perhaps_suffixless_pth
    else:
        pth = Path.cwd().glob(f"{perhaps_suffixless_pth}*")
        if pth:
            suffix = str(list(pth)[0].suffix)
            return f"{perhaps_suffixless_pth}{suffix}"


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
            title = get_title(cwd / branch)
            branch_pth = get_suffix_pth(cwd / branch)
            if title:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)}" data-file-path="{branch_pth}">{title}</button></li>'
            else:
                html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)}" data-file-path="{branch_pth}">{branch}</button></li>'
            if len(toc[branch].subtrees) > 0:
                html = f"{html} <ul>"
                for twig in toc[branch].subtrees:
                    for k, leaf in enumerate(twig.items):
                        title = get_title(cwd / leaf)
                        leaf_pth = get_suffix_pth(cwd / leaf)
                        if title:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)+k+1}" data-file-path="{leaf_pth}">{title}</button></li>'
                        else:
                            html = f'{html} <li><button class="jp-Button toc-button" data-index="{((i+1)*1000)+((j+1)*100)+k+1}" data-file-path="{leaf_pth}">{leaf}</button></li>'
                html = f"{html} </ul>"
        html = f"{html} </ul>"
    html = f"{html} </ul>"
    return html


def get_toc(cwd):
    toc_pth = list(Path(cwd).glob("_toc.yml"))
    config_pth = list(Path(cwd).glob("_config.yml"))
    if len(toc_pth) > 0 or len(config_pth) > 0:
        toc_pth = str(toc_pth[0])
        toc = parse_toc_yaml(toc_pth)
        html_toc = f'<p id="toc_title">{str(get_book_title(config_pth[0]))}</p>'
        author = str(get_author(config_pth[0]))
        if len(author) > 0:
            html_toc = f'{html_toc} <p id="toc_author">Author: {author}</p>'
        html_toc = f"{html_toc} {toc_to_html(toc, Path(cwd).name)}"
    else:
        html_toc = (
            f'<p id="toc_title">Not a Jupyter-Book</p>'
            f'<p id="toc_author">"_toc.yml" and/or "_config.yml" not found in:</p>'
            f'<p id="toc_author">{Path.cwd()}</p>'
            f'<p id="toc_author">Please navigate to a directory containing a Jupyter-Book to view its Table of Contents</p>'
        )

    return {"data": str(html_toc), "cwd": cwd, "browser_dir": Path(cwd).name}
