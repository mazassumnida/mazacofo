import { Module } from '@nestjs/common';

import { BadgeController } from './controllers/badge.controller';
import { ClientModule } from '@/packages/client/client.module';

@Module({
  imports: [ClientModule],
  controllers: [BadgeController],
  providers: [],
})
export class BadgeModule {}
