import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SentryCron } from '@sentry/nestjs';
import { MikroORM } from '@mikro-orm/core';

import { ClientService } from '@/packages/client/services/client.service';
import { CodeforcesService } from '@/packages/codeforces/services/codeforces.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly clientService: ClientService,
    private readonly codeforcesService: CodeforcesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @SentryCron('update-codeforces-data', {
    schedule: {
      type: 'crontab',
      value: CronExpression.EVERY_MINUTE,
    },
    checkinMargin: 2,
    maxRuntime: 3,
    timezone: 'Asia/Seoul',
  })
  async updateCodeforcesData() {
    const em = this.orm.em.fork();
    this.logger.log('Starting Codeforces data update...');

    try {
      await em.begin();

      const clientList = await this.clientService.getAllClients(em);
      const handles = clientList.map((client) => client.handle);

      if (handles.length === 0) {
        this.logger.log('No clients to update');
        return;
      }

      const profiles =
        await this.codeforcesService.getBulkCodeforcesProfile(handles);

      const updatedHandles = [],
        insertedHandles = [];
      for (const p of profiles) {
        const c = await this.clientService.getClient(em, p.handle);
        if (c) {
          this.clientService.updateClient(em, c, p);
          updatedHandles.push(p.handle);
          continue;
        }

        this.clientService.insertClient(em, p);
        insertedHandles.push(p.handle);
      }

      await em.commit();

      this.logger.log(
        `Successfully updated ${updatedHandles.length} clients (${updatedHandles.join(
          ',',
        )})`,
      );
      this.logger.log(
        `Successfully inserted ${insertedHandles.length} clients (${insertedHandles.join(
          ',',
        )})`,
      );
    } catch (e) {
      await em.rollback();

      this.logger.error('Error updating Codeforces data:', e);

      throw e;
    }
  }
}
