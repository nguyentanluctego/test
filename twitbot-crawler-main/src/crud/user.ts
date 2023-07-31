import { DataSource, FindOptionsWhere, Repository } from "typeorm";
import { db } from "../config/dbconnection";
import { User } from "../models/user";

export class UserRepositoryBase {
  private userRepository: Repository<User>;
  constructor(private readonly connection: DataSource) {
    this.userRepository = this.connection.getRepository(User);
  }
  async getOrCreate(query: FindOptionsWhere<User>, data: Partial<User>): Promise<User> {
    let user = await this.userRepository.findOne({ where: query });
    if (!user) {
      user = this.userRepository.create(data);
    }
    user.count_tweets = (user?.count_tweets | 0) + 1;
    await this.userRepository.save(user);
    return user;
  }
  public get repository(): Repository<User> {
    return this.userRepository;
  }
}

export const UserRepository = new UserRepositoryBase(db);
