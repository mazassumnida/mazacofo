import { Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { Test } from '@nestjs/testing';

import { Client } from '@/packages/client/entities/client.entity';
import { ClientService } from '@/packages/client/services/client.service';
import {
  CodeforcesError,
  CodeforcesService,
  TCodeforcesProfile,
} from '@/packages/codeforces/services/codeforces.service';
import {
  SchedulerService,
  UNAVAILABLE_ALERT_THRESHOLD,
} from '@/schedular/services/scheduler.service';

jest.mock('@/utils/random-id', () => ({ randomID: () => 'test' }));

const client = (handle: string) => Object.assign(new Client(), { handle });

const profile = (handle: string): TCodeforcesProfile => ({
  handle,
  rank: 'expert',
  rating: 1700,
  maxRank: 'expert',
  maxRating: 1750,
});

const unavailable = () =>
  new CodeforcesError(
    'UNAVAILABLE',
    'Codeforces API failed (HTTP 502): Bad Gateway',
  );

describe('SchedulerService', () => {
  let scheduler: SchedulerService;

  const em = {
    begin: jest.fn<Promise<void>, []>(),
    commit: jest.fn<Promise<void>, []>(),
    rollback: jest.fn<Promise<void>, []>(),
  };
  const clientService = {
    getAllClients: jest.fn<Promise<Client[]>, []>(),
    getClient: jest.fn<Promise<Client | null>, []>(),
    updateClient: jest.fn<Client, []>(),
    insertClient: jest.fn<Client, []>(),
  };
  const codeforcesService = {
    getBulkCodeforcesProfile: jest.fn<Promise<TCodeforcesProfile[]>, []>(),
  };

  const runTimes = async (times: number) => {
    for (let i = 0; i < times; i++) {
      await scheduler.updateCodeforcesData();
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    clientService.getAllClients.mockResolvedValue([
      client('alice'),
      client('bob'),
    ]);
    clientService.getClient.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: MikroORM, useValue: { em: { fork: () => em } } },
        { provide: ClientService, useValue: clientService },
        { provide: CodeforcesService, useValue: codeforcesService },
      ],
    }).compile();

    scheduler = moduleRef.get(SchedulerService);
    Logger.overrideLogger(false);
  });

  it('stores fetched profiles inside a single transaction', async () => {
    clientService.getClient.mockResolvedValueOnce(client('alice'));
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce([
      profile('alice'),
      profile('bob'),
    ]);

    await scheduler.updateCodeforcesData();

    expect(codeforcesService.getBulkCodeforcesProfile).toHaveBeenCalledWith([
      'alice',
      'bob',
    ]);
    expect(clientService.updateClient).toHaveBeenCalledTimes(1);
    expect(clientService.insertClient).toHaveBeenCalledTimes(1);
    expect(em.begin).toHaveBeenCalledTimes(1);
    expect(em.commit).toHaveBeenCalledTimes(1);
    expect(em.rollback).not.toHaveBeenCalled();
  });

  it('skips the run without throwing when Codeforces is unavailable', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockRejectedValueOnce(
      unavailable(),
    );

    await expect(scheduler.updateCodeforcesData()).resolves.toBeUndefined();

    expect(em.begin).not.toHaveBeenCalled();
    expect(clientService.updateClient).not.toHaveBeenCalled();
  });

  it('throws once Codeforces stays unavailable for the alert threshold', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockRejectedValue(unavailable());

    await runTimes(UNAVAILABLE_ALERT_THRESHOLD - 1);

    await expect(scheduler.updateCodeforcesData()).rejects.toThrow(
      `Codeforces API has been unavailable for ${UNAVAILABLE_ALERT_THRESHOLD} consecutive runs: Codeforces API failed (HTTP 502): Bad Gateway`,
    );

    await runTimes(UNAVAILABLE_ALERT_THRESHOLD - 1);

    await expect(scheduler.updateCodeforcesData()).rejects.toMatchObject({
      type: 'UNAVAILABLE',
    });
  });

  it('resets the unavailable streak after a successful run', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockRejectedValue(unavailable());
    await runTimes(UNAVAILABLE_ALERT_THRESHOLD - 1);

    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce([
      profile('alice'),
    ]);
    await scheduler.updateCodeforcesData();

    await expect(
      runTimes(UNAVAILABLE_ALERT_THRESHOLD - 1),
    ).resolves.toBeUndefined();
  });

  it.each([
    new CodeforcesError('UNKNOWN', 'Codeforces API failed (HTTP 400): ???'),
    new CodeforcesError('NOT_FOUND', 'Profile not found (ghost)', 'ghost'),
  ])('rethrows a %s failure immediately', async (error) => {
    codeforcesService.getBulkCodeforcesProfile.mockRejectedValueOnce(error);

    await expect(scheduler.updateCodeforcesData()).rejects.toBe(error);
    expect(em.begin).not.toHaveBeenCalled();
  });

  it('rolls back and rethrows when saving fails', async () => {
    const failure = new Error('deadlock');
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce([
      profile('alice'),
    ]);
    clientService.getClient.mockRejectedValueOnce(failure);

    await expect(scheduler.updateCodeforcesData()).rejects.toBe(failure);
    expect(em.rollback).toHaveBeenCalledTimes(1);
    expect(em.commit).not.toHaveBeenCalled();
  });
});
