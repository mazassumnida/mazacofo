import dayjs from 'dayjs';

import {
  BeforeCreate,
  BeforeUpdate,
  Property,
  BeforeUpsert,
  OnInit,
  OnLoad,
  AfterCreate,
  AfterUpdate,
  AfterUpsert,
  PropertyOptions,
} from '@mikro-orm/core';

import { randomID } from '@/utils/random-id';

/**
 * Automatically converts timestamp value when load/unloading Memory <-> DB.
 *
 *  - BeforeCreate, BeforeUpdate, BeforeUpsert
 *    : Memory(Dayjs) -> DB(Timestamp String)
 *  - AfterCreate, AfterUpdate, AfterUpsert, OnInit, OnLoad
 *    : DB(Timestamp String) -> Memory(Dayjs)
 */
export function TimestampProperty(options?: PropertyOptions<object>) {
  return (target, propertyName) => {
    const preHookName = `convertDayjsIntoTimestamp_${randomID(6)}`;
    const postHookName = `convertTimestampIntoDayjs_${randomID(6)}`;

    Object.assign(target, {
      [preHookName]: (args) => {
        const entity = args.entity;

        if (entity[propertyName]) {
          if (!dayjs.isDayjs(entity[propertyName])) {
            entity[propertyName] = dayjs(entity[propertyName]);
          }

          entity[propertyName] = entity[propertyName].format(
            'YYYY-MM-DD HH:mm:ss',
          );
        }
      },
      [postHookName]: (args) => {
        const entity = args.entity;

        if (entity[propertyName]) {
          entity[propertyName] = dayjs(entity[propertyName]);
        }
      },
    });

    BeforeCreate()(target, preHookName);
    BeforeUpdate()(target, preHookName);
    BeforeUpsert()(target, preHookName);

    OnInit()(target, postHookName);
    OnLoad()(target, postHookName);
    AfterCreate()(target, postHookName);
    AfterUpdate()(target, postHookName);
    AfterUpsert()(target, postHookName);

    return Property({ type: 'timestamp', ...options })(target, propertyName);
  };
}
