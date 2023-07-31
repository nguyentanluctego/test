import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from "typeorm";
import { Tweet } from "./tweet";

@Entity()
export class Currency {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: false })
  name!: string;

  @Column("varchar", { array: true, nullable: false, default: "{}" })
  keywords!: string[];

  @Column({ type: "varchar", nullable: true })
  description!: string;

  @ManyToMany(() => Tweet, (tweet: Tweet) => tweet.currencies)
  tweets?: Tweet[];

  @Column({ type: "integer", default: 0 })
  count_tweets!: number;
}
