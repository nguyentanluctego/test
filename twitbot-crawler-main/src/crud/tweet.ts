import { DataSource, FindOptionsWhere, Repository } from "typeorm";
import { db } from "../config/dbconnection";
import { Tweet } from "../models/tweet";

class TweetsRepository {
  private tweetRepository: Repository<Tweet>;
  constructor(private readonly connection: DataSource) {
    this.tweetRepository = this.connection.getRepository(Tweet);
  }

  public async getOrCreate(query: FindOptionsWhere<Tweet>, data: Partial<Tweet>): Promise<Tweet> {
    let tweet = await this.tweetRepository.findOne({ where: query });
    if (!tweet) {
      tweet = await this.tweetRepository.save(data);
    }
    
    return tweet;
  }

  public get repository(): Repository<Tweet> {
    return this.tweetRepository;
  }
}

export const TweetRepository = new TweetsRepository(db);
