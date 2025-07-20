import { Module } from '@nestjs/common';

import { ClientService } from './services/client.service';
import { CodeforcesModule } from '../codeforces/codeforces.module';

@Module({
  imports: [CodeforcesModule],
  controllers: [],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
