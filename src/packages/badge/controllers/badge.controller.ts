import { MikroORM } from '@mikro-orm/core';
import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { CodeforcesError } from '@/packages/codeforces/services/codeforces.service';

import { ClientService } from '../../client/services/client.service';
import { SvgUtils } from '../utils/svg.utils';

@Controller()
export class BadgeController {
  private readonly logger = new Logger(BadgeController.name);

  constructor(
    private readonly clientService: ClientService,
    private readonly orm: MikroORM,
  ) {}

  @Get()
  async getBadge(
    @Query('id') id: string,
    @Query('mini') mini: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send('<svg>id query parameter is required</svg>');
    }

    const idFormat = id.replace(/[a-zA-Z0-9-_]/g, '');
    if (idFormat) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send(
          '<svg>id should only contain Latin letters, digits, underscore or dash characters</svg>',
        );
    }

    const em = this.orm.em.fork();

    try {
      const client = await this.clientService.getOrCreateClient(em, id);
      await em.flush();

      if (!client.rank) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .end('<svg>rating not available</svg>');
      }

      if (mini) {
        return res.end(SvgUtils.svgDataMini(client));
      }
      if (client.rank === 'legendary grandmaster') {
        return res.end(SvgUtils.svgDataForLGM(client));
      }
      return res.end(SvgUtils.svgDataForGeneralRating(client));
    } catch (e) {
      if (e instanceof CodeforcesError) {
        if (e.message === 'Profile not found') {
          return res
            .status(HttpStatus.NOT_FOUND)
            .end('<svg>Codeforces profile not found</svg>');
        }
      } else {
        this.logger.error(`Unknown error (${id})`, e);
      }

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .end('<svg>Internal server error</svg>');
    }
  }
}
