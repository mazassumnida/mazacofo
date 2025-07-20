import { Migration } from '@mikro-orm/migrations';

export class Migration20250719144110 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`clients\` change \`topRating\` \`top_rating\` int not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`clients\` change \`top_rating\` \`topRating\` int not null;`);
  }

}
