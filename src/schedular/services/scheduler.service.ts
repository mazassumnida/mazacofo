import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SentryCron } from '@sentry/nestjs';
import { MikroORM } from '@mikro-orm/core';

import { ClientService } from '@/packages/client/services/client.service';
import {
  CodeforcesError,
  CodeforcesService,
  TCodeforcesProfile,
} from '@/packages/codeforces/services/codeforces.service';

export const UNAVAILABLE_ALERT_THRESHOLD = 30;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private consecutiveUnavailableRuns = 0;

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

    const clientList = await this.clientService.getAllClients(em);
    const handles = clientList.map((client) => client.handle);

    if (handles.length === 0) {
      this.logger.log('No clients to update');
      return;
    }

    const profiles = await this.fetchProfiles(handles);
    if (!profiles) {
      return;
    }

    await em.begin();

    const updatedHandles: string[] = [],
      insertedHandles: string[] = [];
    try {
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
    } catch (e) {
      await em.rollback();

      this.logger.error('Error updating Codeforces data:', e);

      throw e;
    }

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
  }

  private async fetchProfiles(
    handles: string[],
  ): Promise<TCodeforcesProfile[] | null> {
    try {
      const profiles =
        await this.codeforcesService.getBulkCodeforcesProfile(handles);
      this.consecutiveUnavailableRuns = 0;
      return profiles;
    } catch (e) {
      if (!(e instanceof CodeforcesError) || e.type !== 'UNAVAILABLE') {
        this.consecutiveUnavailableRuns = 0;
        throw e;
      }

      this.consecutiveUnavailableRuns += 1;
      if (this.consecutiveUnavailableRuns % UNAVAILABLE_ALERT_THRESHOLD === 0) {
        throw new CodeforcesError(
          'UNAVAILABLE',
          `Codeforces API has been unavailable for ${this.consecutiveUnavailableRuns} consecutive runs: ${e.message}`,
        );
      }

      this.logger.warn(
        `Skipping Codeforces data update (${this.consecutiveUnavailableRuns} consecutive unavailable runs): ${e.message}`,
      );
      return null;
    }
  }
}
