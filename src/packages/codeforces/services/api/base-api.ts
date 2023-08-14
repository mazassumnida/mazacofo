import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

type TMethod = "GET" | "HEAD";

export class NoQueryStringError extends Error {
  constructor() {
    super();
    this.name = "NoQueryStringError";
    this.message = "No queryStrings are set.";
  }
}

export class NoPathnameError extends Error {
  constructor() {
    super();
    this.name = "NoPathnameError";
    this.message = "No pathname is set.";
  }
}

export class UnimplementedMethodError extends Error {
  constructor() {
    super();
    this.name = "UnimplementedMethodError";
    this.message = "Unimplemented method is called.";
  }
}

export abstract class BaseCodeForcesApi<TData extends any> {
  baseUrl: string = "https://codeforces.com";

  method: TMethod | null = null;
  pathname: string | null = null;
  pathnameParams: Record<string, string> | null = null;
  queryStrings: Record<string, string> | null = null;

  convertQueryStringsToSearchParams(): URLSearchParams {
    if (!this.queryStrings) {
      throw new NoQueryStringError();
    }

    return new URLSearchParams(this.queryStrings);
  }

  applyHandlebarsToPathname(pathname: string, params: Record<string, string>) {
    const handleBarsRegex = /{{\s*([a-zA-Z0-9]+)\s*}}/g;
    return pathname.replace(handleBarsRegex, (_, key) => params[key]);
  }

  async send(
    configOverrides?: AxiosRequestConfig<TData>,
  ): Promise<AxiosResponse<TData, any>> {
    if (this.pathname === null) {
      throw new NoPathnameError();
    }

    const pathnameAdjusted = this.pathnameParams
      ? this.applyHandlebarsToPathname(this.pathname, this.pathnameParams)
      : this.pathname;

    const urlObj = new URL(pathnameAdjusted, this.baseUrl);

    if (this.method === "GET") {
      return await axios.get(urlObj.toString(), {
        params: this.convertQueryStringsToSearchParams(),
        ...configOverrides,
      });
    }

    if (this.method === "HEAD") {
      return await axios.head(urlObj.toString(), configOverrides);
      // TODO:
    }

    throw new UnimplementedMethodError();
  }
}
