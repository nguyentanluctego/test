import { Page } from "puppeteer";
import { request } from "./request";
import { sleep } from "./utils";

export class TweetCrawling {
    isCrawling = false;
    postQueue: any[] = [];

    constructor(
        private readonly page: Page
    ) { }
    
    async savePost(tweet: any) {
        return request({
            url: '/tweets',
            method: 'POST',
            data: tweet
        });
    }

    goToTweetDetail(post: any) {
        const tweetUrl = `https://twitter.com/someone/status/${post.id_str}`;
        return this.page.goto(tweetUrl);
    }

    async getTweetDetail(post: any) {
        console.log('getting full text of post', post);

        await this.goToTweetDetail(post);

        const resp = await this.page.waitForResponse(resp => resp.url().includes('TweetDetail'));
        const body = await resp.json();
        const tweetDetail = body
            .data
            ?.threaded_conversation_with_injections
            ?.instructions?.[0]
            ?.entries?.[0]
            ?.content
            ?.itemContent
            ?.tweet_results
            ?.result
            ?.legacy;

        console.log(tweetDetail);
        
        if (!tweetDetail) {
            console.warn('TweetDetail endpoint return invalid response');
            return;
        }

        return this.savePost(tweetDetail);
    }

    async processQueue(): Promise<void> {
        this.isCrawling = true;

        if (!this.postQueue.length) {
            this.isCrawling = false;
            return;
        }

        const post = this.postQueue.shift();

        await this.getTweetDetail(post);

        await sleep(5000);

        return this.processQueue();
    }

    queue(post: any) {
        this.postQueue.push(post);
        
        if (this.isCrawling) return;

        this.processQueue();
    }
}