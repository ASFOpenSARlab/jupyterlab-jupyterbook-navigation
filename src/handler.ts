import { URLExt } from "@jupyterlab/coreutils";
import { ServerConnection } from "@jupyterlab/services";

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param browser_dir Current broswer directory as a string
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = "",
  browser_dir = "",
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  let requestUrl = URLExt.join(
    settings.baseUrl,
    "jupyterlab-jupyterbook-navigation", // API Namespace
    endPoint
  );

  // Include browser_dir in the request
  if (browser_dir) {
    requestUrl += `?browser_dir=${encodeURIComponent(browser_dir)}`;
  }

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log("Not a JSON response body.", response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}
