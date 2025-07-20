import { Migration } from '@mikro-orm/migrations';

export class Migration20250719144543 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`clients\` modify \`created_at\` datetime not null default current_timestamp, modify \`updated_at\` datetime not null default current_timestamp;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`clients\` modify \`created_at\` datetime not null, modify \`updated_at\` datetime not null;`);
  }

}
