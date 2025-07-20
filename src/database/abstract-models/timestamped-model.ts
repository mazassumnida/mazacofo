import dayjs, { Dayjs } from 'dayjs';
import { sql } from '@mikro-orm/core';

import { TimestampProperty } from '../decorators/timestamp-property';

export abstract class TimestampedModel {
  @TimestampProperty({ default: sql.now() })
  createdAt: Dayjs = dayjs();

  @TimestampProperty({
    onUpdate: () => dayjs(),
    default: sql.now(),
  })
  updatedAt: Dayjs = dayjs();
}
