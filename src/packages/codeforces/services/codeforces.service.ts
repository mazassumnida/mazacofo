import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface TCodeforcesProfile {
  handle: string;
  rank: string;
  rating: number;
  maxRank: string;
  maxRating: number;
}

export type TCodeforcesResponse =
  | {
      status: 'OK';
      result: TCodeforcesProfile[];
    }
  | {
      status: 'FAILED';
      comment: string;
    };

export class CodeforcesError extends Error {
  message: 'Profile not found' | 'Unknown error';

  constructor(message: string) {
    super(message);
    this.name = 'CodeforcesError';
  }
}

@Injectable()
export class CodeforcesService {
  private readonly logger = new Logger(CodeforcesService.name);

  async getCodeforcesProfile(handle: string): Promise<TCodeforcesProfile[]> {
    const url = `https://codeforces.com/api/user.info?handles=${handle}`;

    try {
      const { data } = await axios.get<TCodeforcesResponse>(url);
      if (data.status === 'OK') {
        return data.result;
      }

      // NOTE: never
      throw new CodeforcesError(data.comment);
    } catch (error) {
      const { ok, changedHandle } = await this.checkIfHandleIsRenamed(handle);
      if (ok) {
        return await this.getCodeforcesProfile(changedHandle);
      }

      const reg = new RegExp('handles: User with handle (.*?) not found');
      const errorMessage = error.response?.data?.comment;
      const matched = errorMessage?.match(reg);

      if (matched && matched[1]) {
        this.logger.warn(`Codeforces profile not found (${matched[1]})`);
        throw new CodeforcesError('Profile not found');
      }

      this.logger.error(`Unknown error: ${errorMessage} (${handle})`, error);
      throw new CodeforcesError('Unknown error');
    }
  }

  async getBulkCodeforcesProfile(
    handles: string[],
  ): Promise<TCodeforcesProfile[]> {
    const handlesStr = handles.join(';');
    return this.getCodeforcesProfile(handlesStr);
  }

  private async checkIfHandleIsRenamed(
    handle: string,
  ): Promise<{ ok: boolean; changedHandle: string | null }> {
    try {
      await axios.head(`https://codeforces.com/profile/${handle}`, {
        maxRedirects: 0,
      });
    } catch (e) {
      const response = e.response;

      if (response?.status === 302) {
        const movedURL = response.headers.location;
        return {
          ok: true,
          changedHandle: movedURL.replace(
            'https://codeforces.com/profile/',
            '',
          ),
        };
      }
    }

    return { ok: false, changedHandle: null };
  }
}
