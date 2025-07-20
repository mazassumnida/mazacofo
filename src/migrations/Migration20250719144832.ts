import { Migration } from '@mikro-orm/migrations';

export class Migration20250719144832 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`clients\` modify \`rank\` varchar(255) null, modify \`rating\` int null, modify \`max_rank\` varchar(255) null, modify \`top_rating\` int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`clients\` modify \`rank\` varchar(255) not null, modify \`rating\` int not null, modify \`max_rank\` varchar(255) not null, modify \`top_rating\` int not null;`);
  }

}
