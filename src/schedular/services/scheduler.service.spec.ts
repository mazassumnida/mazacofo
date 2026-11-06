import { Logger } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { Test } from '@nestjs/testing';

import { Client } from '@/packages/client/entities/client.entity';
import { ClientService } from '@/packages/client/services/client.service';
import {
  CodeforcesError,
  CodeforcesService,
  TCodeforcesBulkResult,
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

const bulkResult = (
  handles: string[],
  extra: Partial<Omit<TCodeforcesBulkResult, 'profiles'>> = {},
): TCodeforcesBulkResult => ({
  profiles: handles.map(profile),
  renamedHandles: [],
  missingHandles: [],
  ...extra,
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
    getClient: jest.fn<Promise<Client | null>, [unknown, string]>(),
    updateClient: jest.fn<Client, [unknown, Client, TCodeforcesProfile]>(),
    insertClient: jest.fn<Client, [unknown, TCodeforcesProfile]>(),
    renameClient: jest.fn<Client, [unknown, Client, string]>(),
    removeClient: jest.fn<void, [unknown, Client]>(),
  };
  const codeforcesService = {
    getBulkCodeforcesProfile: jest.fn<Promise<TCodeforcesBulkResult>, []>(),
  };
  let alice: Client;
  let bob: Client;

  const runTimes = async (times: number) => {
    for (let i = 0; i < times; i++) {
      await scheduler.updateCodeforcesData();
    }
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    alice = client('alice');
    bob = client('bob');
    clientService.getAllClients.mockResolvedValue([alice, bob]);
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
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice', 'bob']),
    );

    await scheduler.updateCodeforcesData();

    expect(codeforcesService.getBulkCodeforcesProfile).toHaveBeenCalledWith([
      'alice',
      'bob',
    ]);
    expect(clientService.updateClient).toHaveBeenCalledTimes(2);
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      alice,
      profile('alice'),
    );
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      bob,
      profile('bob'),
    );
    expect(clientService.getClient).not.toHaveBeenCalled();
    expect(clientService.insertClient).not.toHaveBeenCalled();
    expect(em.begin).toHaveBeenCalledTimes(1);
    expect(em.commit).toHaveBeenCalledTimes(1);
    expect(em.rollback).not.toHaveBeenCalled();
  });

  it('matches stored clients to profiles case-insensitively', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['Alice']),
    );

    await scheduler.updateCodeforcesData();

    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      alice,
      profile('Alice'),
    );
    expect(clientService.insertClient).not.toHaveBeenCalled();
  });

  it('looks up the database before inserting a profile it did not load', async () => {
    const carol = client('carol');
    clientService.getClient.mockResolvedValueOnce(carol);
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['carol', 'dave']),
    );

    await scheduler.updateCodeforcesData();

    expect(clientService.getClient).toHaveBeenCalledWith(em, 'carol');
    expect(clientService.getClient).toHaveBeenCalledWith(em, 'dave');
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      carol,
      profile('carol'),
    );
    expect(clientService.insertClient).toHaveBeenCalledWith(
      em,
      profile('dave'),
    );
  });

  it('removes a client whose handle no longer exists without failing the run', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice'], { missingHandles: ['bob'] }),
    );

    await expect(scheduler.updateCodeforcesData()).resolves.toBeUndefined();

    expect(clientService.removeClient).toHaveBeenCalledTimes(1);
    expect(clientService.removeClient).toHaveBeenCalledWith(em, bob);
    expect(clientService.updateClient).toHaveBeenCalledTimes(1);
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      alice,
      profile('alice'),
    );
    expect(em.commit).toHaveBeenCalledTimes(1);
  });

  it('removes clients even when no handle is left to update', async () => {
    clientService.getAllClients.mockResolvedValueOnce([bob]);
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult([], { missingHandles: ['bob'] }),
    );

    await scheduler.updateCodeforcesData();

    expect(clientService.removeClient).toHaveBeenCalledWith(em, bob);
    expect(clientService.updateClient).not.toHaveBeenCalled();
    expect(em.commit).toHaveBeenCalledTimes(1);
  });

  it('renames a client and stores the profile under its new handle', async () => {
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice', 'robert'], {
        renamedHandles: [{ from: 'bob', to: 'robert' }],
      }),
    );

    await scheduler.updateCodeforcesData();

    expect(clientService.renameClient).toHaveBeenCalledWith(em, bob, 'robert');
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      bob,
      profile('robert'),
    );
    expect(clientService.insertClient).not.toHaveBeenCalled();
    expect(clientService.getClient).not.toHaveBeenCalled();
    expect(clientService.removeClient).not.toHaveBeenCalled();
  });

  it('drops the old client when the renamed handle is already stored', async () => {
    const robert = client('robert');
    clientService.getAllClients.mockResolvedValueOnce([alice, bob, robert]);
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice', 'robert'], {
        renamedHandles: [{ from: 'bob', to: 'robert' }],
      }),
    );

    await scheduler.updateCodeforcesData();

    expect(clientService.removeClient).toHaveBeenCalledWith(em, bob);
    expect(clientService.renameClient).not.toHaveBeenCalled();
    expect(clientService.updateClient).toHaveBeenCalledWith(
      em,
      robert,
      profile('robert'),
    );
    expect(clientService.insertClient).not.toHaveBeenCalled();
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

    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice']),
    );
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
    codeforcesService.getBulkCodeforcesProfile.mockResolvedValueOnce(
      bulkResult(['alice']),
    );
    clientService.updateClient.mockImplementationOnce(() => {
      throw failure;
    });

    await expect(scheduler.updateCodeforcesData()).rejects.toBe(failure);
    expect(em.rollback).toHaveBeenCalledTimes(1);
    expect(em.commit).not.toHaveBeenCalled();
  });
});
