import { Module } from '@nestjs/common';

import { CodeforcesService } from './services/codeforces.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CodeforcesService],
  exports: [CodeforcesService],
})
export class CodeforcesModule {}
