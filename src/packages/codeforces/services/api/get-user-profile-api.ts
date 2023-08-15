import { BaseCodeForcesApi } from "./base-api";
import type { TRank } from "../../typing";

type TGetUserProfileApiResponseBody = {
  status: "OK" | string;
  result: [
    {
      handle: string;
      email?: string;
      vkId?: string;
      openId?: string;
      firstName?: string;
      lastName?: string;
      country?: string;
      city?: string;
      organization?: string;
      contribution: number;
      rank: TRank;
      rating: number;
      maxRank: TRank;
      maxRating: number;
      lastOnlineTimeSeconds: number;
      registrationTimeSeconds: number;
      friendOfCount: number;
      avatar: string;
      titlePhoto: string;
    },
  ];
};

export type TUserProfile = TGetUserProfileApiResponseBody["result"][0];

export class GetUserProfileApi extends BaseCodeForcesApi<TGetUserProfileApiResponseBody> {
  method: "GET" = "GET";

  pathname: string = "/api/user.info";

  setHandles(handles: string[]) {
    this.queryStrings = {
      handles: handles.join(";"),
    };
  }
}
