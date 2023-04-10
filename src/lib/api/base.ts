import { buildQueryString } from "../../helpers/utils";

export interface Options {
  headers?: object;
  query?: object | string;
}

export default abstract class Base {
  async request(method: string, path: string, options: Options = {}) {
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

    try {
      const response = await fetch(url, requestInit);

      if (!response.ok) {
        throw response;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  abstract getBaseURL(): string;
}
