import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Tweet } from "./tweet";

export enum TaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
}

@Entity({ name: "tasks" })
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: false })
  process_id!: string;

  @Column({ type: "varchar", nullable: true })
  title!: string | null;

  @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.PENDING })
  status!: TaskStatus;

  @Column({ type: "varchar", nullable: true })
  campaign!: string | null;

  @Column({ type: "jsonb", nullable: true })
  meta_data!: { [k: string]: any };

  @OneToMany((type) => Tweet, (tweet) => tweet.task)
  tweets!: string[];
}
