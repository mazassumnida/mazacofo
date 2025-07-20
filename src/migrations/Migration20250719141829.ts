import { Migration } from '@mikro-orm/migrations';

export class Migration20250719141829 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`clients\` (\`id\` int unsigned not null auto_increment primary key, \`handle\` varchar(255) not null, \`rank\` varchar(255) not null, \`rating\` int not null, \`max_rank\` varchar(255) not null, \`topRating\` int not null, \`created_at\` datetime not null, \`updated_at\` datetime not null) default character set utf8mb4 collate utf8mb4_general_ci engine = InnoDB;`);
    this.addSql(`alter table \`clients\` add unique \`clients_handle_unique\`(\`handle\`);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`clients\`;`);
  }

}
