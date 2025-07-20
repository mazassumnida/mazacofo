import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SchedulerService } from './services/scheduler.service';
import { CodeforcesModule } from '@/packages/codeforces/codeforces.module';
import { ClientModule } from '@/packages/client/client.module';

@Module({
  imports: [CodeforcesModule, ClientModule, ScheduleModule.forRoot()],
  controllers: [],
  providers: [SchedulerService],
})
export class SchedularModule {}
