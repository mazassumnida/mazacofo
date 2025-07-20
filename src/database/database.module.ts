import { Module } from '@nestjs/common';

import { FlushMode } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import mikroOrmConfig from './mikro-orm.config';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      useFactory: () => ({
        // Ref: https://wanago.io/2022/06/06/api-nestjs-transactions-postgresql-mikroorm
        flushMode: FlushMode.COMMIT,
        debug: process.env.BINDING_ENV === 'development',
        ...mikroOrmConfig,
      }),
    }),
  ],
})
export class DatabaseModule {}
