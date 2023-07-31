import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: true })
  id_str!: string;

  @Column({ type: "varchar", nullable: false })
  name!: string;

  @Column({ type: "boolean", nullable: true })
  following!: boolean;

  @Column({ type: "varchar", nullable: false })
  url!: string;

  @Column({ type: "varchar", nullable: true })
  description!: string;

  @Column({ type: "integer", nullable: true })
  followers_count!: number;

  @Column({ type: "varchar", nullable: true })
  profile_image_url!: string;

  @Column({ type: "integer", nullable: true })
  friends_count!: number;

  @Column({ type: "timestamp", nullable: false })
  created_at!: Date;

  @Column({ type: "integer", default: 0 })
  count_tweets!: number;
}
