import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';

import { CodeforcesModule } from './packages/codeforces/codeforces.module';
import { BadgeModule } from './packages/badge/badge.module';
import { ClientModule } from './packages/client/client.module';
import { DatabaseModule } from './database/database.module';
import { SchedularModule } from './schedular/schedular.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    DatabaseModule,
    CodeforcesModule,
    BadgeModule,
    ClientModule,
    SchedularModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
export class AppModule {}
