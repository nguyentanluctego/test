import dotenv from "dotenv";

dotenv.config();

export const config = {
  username: process.env.USER_NAME as string,
  password: process.env.PASSWORD as string,
  phoneNumber: process.env.PHONE_NUMBER as string,
  search_refresh: Number(process.env.SEARCH_REFRESH),
  home_refresh: Number(process.env.HOME_REFRESH),
  hook_event_url: process.env.HOOK_EVENT_URL as string,
  database: {
    host: process.env.DATABASE_HOST as string,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER as string,
    password: process.env.DATABASE_PASSWORD as string,
    database: process.env.DATABASE_NAME as string,
    synchronize: process.env.DATABASE_SYNCHRONIZE == "true",
  },
  redis: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
};
