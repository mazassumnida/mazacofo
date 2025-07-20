import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Client } from '../entities/client.entity';
import {
  CodeforcesService,
  TCodeforcesProfile,
} from '../../codeforces/services/codeforces.service';

@Injectable()
export class ClientService {
  constructor(
    private readonly em: EntityManager,
    private readonly codeforcesService: CodeforcesService,
  ) {}

  async getClient(em: EntityManager, handle: string): Promise<Client | null> {
    return em.findOne(Client, { handle });
  }

  async getAllClients(em: EntityManager): Promise<Client[]> {
    return em.find(Client, {});
  }

  insertClient(em: EntityManager, userData: TCodeforcesProfile) {
    if (!userData.handle) return;

    const client = em.create(Client, {
      handle: userData.handle,
      rank: userData.rank,
      rating: userData.rating,
      maxRank: userData.maxRank,
      topRating: userData.maxRating,
    });
    em.persist(client);

    return client;
  }

  updateClient(
    em: EntityManager,
    client: Client,
    userData: TCodeforcesProfile,
  ) {
    client.rank = userData.rank;
    client.rating = userData.rating;
    client.maxRank = userData.maxRank;
    client.topRating = userData.maxRating;

    em.persist(client);

    return client;
  }

  async getOrCreateClient(em: EntityManager, handle: string) {
    const c = await this.getClient(em, handle);
    if (c) {
      return c;
    }

    const profile = await this.codeforcesService.getCodeforcesProfile(handle);
    if (profile.length === 0) {
      throw new Error('never');
    }

    // NOTE: Rename한 handle의 경우
    if (profile[0].handle !== handle) {
      return this.getOrCreateClient(em, profile[0].handle);
    }

    const client = this.insertClient(em, profile[0]);
    return client;
  }
}
