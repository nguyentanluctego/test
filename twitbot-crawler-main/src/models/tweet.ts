import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Currency } from "./currency";
import { Task } from "./task";

@Entity({ name: "tweets" })
export class Tweet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: false })
  path_json!: string;

  @Column({ type: "varchar", nullable: false })
  id_string!: string;

  @Column({ type: "uuid", nullable: false })
  user_id!: string;

  @Column({ type: "varchar", nullable: false })
  url_detail!: string;

  @Column({ type: "timestamp", nullable: true })
  created_at!: Date;

  @Column({ type: "varchar", nullable: true })
  campaign!: string;

  @ManyToMany(() => Currency, (currency: Currency) => currency.tweets)
  @JoinTable({
    name: "tweets_currency",
    joinColumn: { name: "tweets_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "currency_id" },
  })
  currencies!: Currency[];

  @ManyToOne((type) => Task, (task) => task.tweets)
  @JoinColumn({ name: "task_id" })
  task!: Task;
}
