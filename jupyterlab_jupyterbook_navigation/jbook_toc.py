import json
from pathlib import Path
import yaml

from sphinx_external_toc.parsing import parse_toc_yaml


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
    else:
        return file_pth


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


def get_suffix_pth(perhaps_suffixless_pth, cwd):
    pth = list(cwd.glob(f"{perhaps_suffixless_pth}*"))
    if len(pth) > 0:
        return  pth[0].relative_to(cwd)
    else:
        return perhaps_suffixless_pth

def get_sub_section(parts, cwd, level=1, html=''):
    cwd = Path(cwd)
    for k in parts:
        if type(k) != dict:
            return html
        if 'sections' in k.keys():
            pth = get_suffix_pth(k['file'], cwd)
            title = get_title(cwd/pth)
            html = f'''{html}
            <div>
                <button class="jp-Button toc-button tb-level{level}"style="display: inline-block;" data-file-path="{str(pth)}">{title}</button>
                <button class="jp-Button toc-chevron" style="display: inline-block;"><i class="fa fa-chevron-down "></i></button>
            </div>
            <div style="display: none;">
            '''

            html = get_sub_section(k['sections'], cwd, level=level+1, html=html)
            html = f'{html}\n</div>'
        elif 'file' in k.keys():
            pth = get_suffix_pth(k['file'], cwd)
            title = get_title(cwd/pth)
            if title:
                html = f'{html} <button class="jp-Button toc-button tb-level{level}" style="display: block;" data-file-path="{str(pth)}">{title}</button>'
            else:
                html = f'{html} <button class="jp-Button toc-button tb-level{level}" style="display: block;" data-file-path="{str(pth)}">{k["file"]}</button>'

        elif 'url' in k.keys():
            html = f'{html} <a class="tb-level{level}" href="{k["url"]}" style="display: block;">{k["title"]}</a>'
        elif 'glob' in k.keys():
            pass
    return html


def toc_to_html(toc, cwd):
    html = f'\n<ul>'

    for chapter in toc["parts"]:
        html = f'{html}\n<p class="caption" role="heading"><span class="caption-text"><b>\n{chapter["caption"]}\n</b></span>\n</p>'
        try:
            html = f'{html}\n{get_sub_section(chapter["chapters"], cwd)}'
        except Exception as e:
            return str(e)
    html = f'{html}\n</ul>'
    return html

def get_toc(cwd):
    toc_pth = list(Path(cwd).glob("_toc.yml"))
    config_pth = list(Path(cwd).glob("_config.yml"))
    if len(toc_pth) > 0 or len(config_pth) > 0:
        toc_pth = str(toc_pth[0])


        with open(toc_pth, 'r') as f:
            toc = yaml.safe_load(f)

        html_toc = f'<p id="toc-title">{str(get_book_title(config_pth[0]))}</p>'
        author = str(get_author(config_pth[0]))
        if len(author) > 0:
            html_toc = f'{html_toc} <p id="toc-author">Author: {author}</p>'
        html_toc = f"{html_toc} {toc_to_html(toc, Path(cwd))} </div>"
    else:
        html_toc = (
            f'<p id="toc-title">Not a Jupyter-Book</p>'
            f'<p id="toc-author">"_toc.yml" and/or "_config.yml" not found in:</p>'
            f'<p id="toc-author">{Path(cwd)}</p>'
            f'<p id="toc-author">Please navigate to a directory containing a Jupyter-Book to view its Table of Contents</p>'
        )

    return {"data": str(html_toc), "cwd": cwd, "browser_dir": Path(cwd).name}
