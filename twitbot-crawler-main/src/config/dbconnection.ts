import "reflect-metadata";
import { DataSource } from "typeorm";
import { Currency } from "../models/currency";
import { User } from "../models/user";
import { Tweet } from "../models/tweet";
import { Task } from "../models/task";
import { config } from ".";

export class DBConnection {
  private connection!: DataSource;

  constructor(
    private readonly hostDetail: { host: string; port: number; user: string; password: string },
    private readonly dbName: string
  ) {}

  public connect() {
    try {
      this.connection = new DataSource({
        type: "postgres",
        host: this.hostDetail.host,
        port: this.hostDetail.port,
        username: this.hostDetail.user,
        password: this.hostDetail.password,
        database: this.dbName,
        synchronize: config.database.synchronize,
        // logging: "all",
        entities: [
          Currency,
          User,
          Tweet,
          Task,
          /* Add your entity classes here */
        ],
      });

      console.log("Connected to database");
      return this.connection;
    } catch (error) {
      console.log("Failed to connect to database");
      throw error;
    }
  }
}

export const db = new DBConnection(
  {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
  },
  config.database.database
).connect();

// db.initialize()
//   .then(() => {
//     console.log("Data Source has been initialized!");
//   })
//   .catch((err) => {
//     console.error("Error during Data Source initialization", err);
//   });
