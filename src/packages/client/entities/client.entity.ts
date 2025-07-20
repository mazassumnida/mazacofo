import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

import { TimestampedModel } from '@/database/abstract-models/timestamped-model';

@Entity({ tableName: 'clients' })
export class Client extends TimestampedModel {
  @PrimaryKey()
  id: number;

  @Property({ length: 255, unique: true })
  handle: string;

  @Property({ length: 255, nullable: true })
  rank: string | null;

  @Property({ nullable: true })
  rating: number | null;

  @Property({ nullable: true })
  maxRank: string | null;

  @Property({ nullable: true })
  topRating: number | null;
}
