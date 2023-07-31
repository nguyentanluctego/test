import BeeQueue from "bee-queue";

const addQueue = new BeeQueue("tasks", {
  redis: {
    port: 46379,
    host: "localhost",
  },
});
addQueue.process(async (job, done) => {
    console.log("Pre start", job);
    // const data = await this.crawler.searchTweetsByKeyWord(job.data.keyword, 10);
    // console.log(data);
    console.log("Done", job);
    done("Done");
    return
  });

const job = addQueue.createJob({x: 2, y: 3}).save();
console.log("xxxx");
// job.then((data) => console.log(data));
