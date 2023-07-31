import { DataSource, Repository } from "typeorm";
import { db } from "../config/dbconnection";
import { Task, TaskStatus } from "../models/task";

export class TaskRepositoryBase {
  private taskRepository: Repository<Task>;
  constructor(private readonly connection: DataSource) {
    this.taskRepository = this.connection.getRepository(Task);
  }

  public async getTaskRunningOrCreate(keyword: string, data: Partial<Task>): Promise<Task> {
    let task = await this.taskRepository
      .createQueryBuilder("task")
      .where("task.status = :status", { status: TaskStatus.RUNNING })
      .andWhere("task.meta_data->>'keyword' = :keyword", { keyword: keyword })
      .getOne();
    if (!task) {
      task = await this.taskRepository.save(data)      
    }
    
    return task;
  }

  public get repository(): Repository<Task> {
    return this.taskRepository;
  }
}

export const TaskRepository = new TaskRepositoryBase(db);
