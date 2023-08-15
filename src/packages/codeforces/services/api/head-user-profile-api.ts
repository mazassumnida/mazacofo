// eslint-disable-next-line max-classes-per-file
import { AxiosError } from "axios";

import { BaseCodeForcesApi } from "./base-api";

type THeadUserProfileApiResponseBody = {};

export class NoProfileRedirectionError extends Error {
  constructor(handle: string) {
    super();
    this.name = "NoProfileRedirectionError";
    this.message = `No redirected profile for handle(${handle})`;
  }
}

export class HeadUserProfileApi extends BaseCodeForcesApi<THeadUserProfileApiResponseBody> {
  method: "HEAD" = "HEAD";

  pathname: string = "/profile/{{handle}}";

  pathnameParams: Record<string, string>;

  handle: string;

  constructor({ handle }: { handle: string }) {
    super();

    this.handle = handle;
    this.pathnameParams = {
      handle,
    };
  }

  updateHandle(handle: string) {
    this.pathnameParams = {
      handle,
    };
  }

  async send() {
    try {
      return await super.send({
        maxRedirects: 0,
      });
    } catch (e) {
      const axiosError = e as AxiosError<any, any>;
      const { response } = axiosError;

      if (response?.status === 302) {
        return response;
      }
    }

    throw new NoProfileRedirectionError(this.handle);
  }
}
