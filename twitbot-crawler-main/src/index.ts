import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import { db } from "./config/dbconnection";
import { crawler } from "./crawller/app";
import { CrawController } from "./services/craw";

const app = express();
const port = 3000;

// Middleware for logging requests
app.use(morgan("combined"));

// Middleware for parsing JSON bodies
app.use(express.json());

app.use("/tweets", express.static("tweets"));

// Middleware for parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Custom middleware for enhanced logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

async function startServer() {
  await db.initialize().then(() => {
    console.log("Data Source has been initialized!");
  }).catch((err) => {
    console.error("Error during Data Source initialization", err);
  });
  const crawlerActor = await crawler();

  const crawl = new CrawController(crawlerActor);
  await crawl.refreshTask();

  app.post("/search", async (req: Request, res: Response) => {
    return await crawl.searchByKeyword(req, res);
  });
  // Define a route handler for the root path
  app.get("/", (req: Request, res: Response) => {
    res.send("Hello, World!");
  });

  // Define a route handler for POST requests

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch((err) => console.log(err));
