import {
  TClient,
  getClient,
  insertClient,
  updateClient,
} from "packages/database/client-table-service";
import { GetUserProfileApi } from "../api/get-user-profile-api";
import {
  HeadUserProfileApi,
  NoProfileRedirectionError,
} from "../api/head-user-profile-api";

export class UserProfileNotFoundError extends Error {
  constructor(handle: string) {
    super();
    this.name = "UserProfileNotFoundError";
    this.message = `User profile not found for handle(${handle})`;
  }
}

export const checkForTheChangedHandle = async (
  handle: string,
): Promise<string> => {
  const response = await new HeadUserProfileApi({ handle }).send();
  const movedURL =
    response.headers.location ?? // for status 200
    response.config.url; // for status 302

  if (movedURL === "https://codeforces.com/") {
    throw new NoProfileRedirectionError(handle);
  }

  return movedURL.replace("https://codeforces.com/profile/", "");
};

export const getUserTierData = async (handle: string): Promise<TClient> => {
  const request = new GetUserProfileApi();
  request.setHandles([handle]);

  try {
    const {
      data: { result },
    } = await request.send();

    return { topRating: result[0].maxRating, ...result[0] };
  } catch (e) {
    try {
      const changedHandle = await checkForTheChangedHandle(handle);
      return await getUserTierData(changedHandle);
    } catch (e) {
      // eslint-disable-next-line no-empty
      if (e instanceof NoProfileRedirectionError) {
      } else {
        // TODO: Do something
        throw e;
      }
    }
  }

  throw new UserProfileNotFoundError(handle);
};

export const getUserTierDataAndUpdateClient = async (
  handle: string,
): Promise<TClient> => {
  const client = await getUserTierData(handle);

  try {
    await getClient(client.handle);
    await updateClient(client);
  } catch (e) {
    await insertClient(client);
  }

  return client;
};
