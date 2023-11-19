import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from jupyter_server.services.contents.filemanager import FileContentsManager

import tornado

from .jbook_toc import get_toc


class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        browser_dir = self.get_argument("browser_dir", default=None)

        fcm = FileContentsManager()
        cwd = f"{fcm.root_dir}/{browser_dir}"

        data = get_toc(cwd)

        self.finish(json.dumps(data))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(
        base_url, "jupyterlab-jupyterbook-navigation", "get-toc"
    )
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
