import BeeQueue from "bee-queue";
import { Request, Response } from "express";
import { Twitter } from "../crawller/twitter";
import { TaskRepository } from "../crud/task";
import { TaskStatus } from "../models/task";
import { sleep } from "../utils";
import { config } from "../config";
import { randomUUID } from "node:crypto";

const tasks = new BeeQueue("tasks", {
  redis: {
    port: config.redis.port,
    host: config.redis.host,
  },
  storeJobs: false,
  removeOnFailure: true,
  removeOnSuccess: true,
});
export class CrawController {
  private crawler: Twitter;
  constructor(twitter: Twitter) {
    this.crawler = twitter;
    tasks.process(10, async (job: any, done: any) => {
      job.remove();
      if (job.data) {
        console.log("Start");
        while (!this.crawler.isReady) {
          await sleep(1000);
          console.log("Waiting credentials");
        }
        const taskObject = await TaskRepository.getTaskRunningOrCreate(job.data.keyword, {
          status: TaskStatus.RUNNING,
          id: randomUUID(),
          process_id: job.id,
          meta_data: { keyword: job.data.keyword, fromDate: job.data.fromDate, toDate: job.data.toDate },
          campaign: job.data.campaign,
        });

        const data = await this.crawler.searchTweetsByKeyWord(
          job.data.keyword,
          taskObject.meta_data.cursor || "",
          taskObject,
          job.data.fromDate,
          job.data.toDate
        );
        await TaskRepository.repository.update(taskObject.id, {
          status: TaskStatus.COMPLETED,
        });
        console.log("Done");
        done("Done");
      }
    });
  }

  async searchByKeyword(req: Request, res: Response) {
    if (!new Date(req.body.fromDate).valueOf() || !new Date(req.body.toDate).valueOf()){
        res.json("Error: fromDate or toDate is empty or invalid: dd-mm-yyyy");
        return
    }
    const job = await tasks.createJob({ keyword: req.body.keyword, fromDate: req.body.fromDate, toDate: req.body.toDate }).save();
    res.json(`Success run on job: ${job.id}`);
  }

  async refreshTask() {
    const jobs = await TaskRepository.repository.find({ where: { status: TaskStatus.RUNNING } });
    for (const job of jobs) {
      await tasks.createJob({ keyword: job.meta_data.keyword, fromDate: job.meta_data.fromDate, toDate: job.meta_data.toDate }).save();
    }
    console.log(`Refresh ${jobs.length} tasks ${jobs.map((job) => job.meta_data.keyword)}`);
  }
}
