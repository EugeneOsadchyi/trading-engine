import { buildQueryString } from "../../helpers/utils";

export interface Options {
  headers?: object;
  query?: object | string;
}

export default abstract class Base {
  request(method: string, path: string, options: Options = {}) {
    let url = `${this.getBaseURL()}${path}`;

    const requestInit: RequestInit = {
      method,
      headers: {
        ...options.headers,
      },
    };

    let queryString = '';

    if (typeof options.query == 'object') {
      queryString = buildQueryString(options.query)
    } else if (typeof options.query == 'string') {
      queryString = options.query;
    }

    if (queryString) {
      url = `${url}?${queryString}`;
    }

    return fetch(url, requestInit)
      .then(response => response.json());
  }

  abstract getBaseURL(): string;
}
