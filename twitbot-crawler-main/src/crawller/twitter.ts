import axios from "axios";
import { EventEmitter } from "events";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { GhostCursor, createCursor } from "ghost-cursor";
import queryString from "querystring";
import { HTTPResponse, Page } from "puppeteer";
import { python } from "pythonia";
import { config } from "../config";
import { CurrencyRepository } from "../crud/currency";
import { TaskRepository } from "../crud/task";
import { TweetRepository } from "../crud/tweet";
import { UserRepository } from "../crud/user";
import { Task } from "../models/task";
import { sleep } from "../utils";
import { URL } from "url";
import { CursorTweet, Tweet, TweetData } from "./dto";
import { randomUUID } from "crypto";
export class Twitter extends EventEmitter {
  private cursor: GhostCursor;
  private nextHomeURL = "";
  private searchURL = "";
  private headers: any;
  public isReady: boolean = false;
  private TIME_WAITING = 300000;

  constructor(
    private readonly page: Page,
    private readonly secondPage: Page,
    private readonly account: {
      username: string;
      password: string;
      phoneNumber: string;
    }
  ) {
    super();
    //@ts-ignore
    python.setFastMode(true);

    this.cursor = createCursor(page);
    this.cursor.toggleRandomMove(true);
    this.page.setRequestInterception(true);
    this.page.on("request", (req) => {
      if (req.url() == "https://api.twitter.com/1.1/onboarding/task.json" && req.method() == "POST") {
        console.log(JSON.parse(req.postData() as string).subtask_inputs[0]);
      }
      req.continue();
    });
  }

  async newPostsListener(response: HTTPResponse) {
    const url = response.url();
    if (url.includes("/HomeLatestTimeline") && !this.headers) {
      await this.getCredentials(response);
      console.log("Got credentials");
    }
    // const response = await this.page.waitForResponse((url) => url.url().includes("/HomeLatestTimeline"), { timeout: 10000 });
  }

  async enterPhoneNumber(): Promise<boolean> {
    console.log("typing phone number");

    const { page, account } = this;

    await page.type('input[type="text"]', account.phoneNumber);
    await page.keyboard.press("Enter");

    const resp = await page.waitForResponse("https://api.twitter.com/1.1/onboarding/task.json");
    const body = await resp.json();
    console.log(body);

    if (body.errors) {
      const [{ message }] = body.errors;
      if (message == "Wrong password!") {
        return false;
      }
      return this.enterPhoneNumber();
    }

    return true;
  }

  async enterPhoneNumberOneMoreTime() {
    console.log("enter phone number one more time");

    const { page, account } = this;

    await page.type('input[type="tel"]', account.phoneNumber);
    await page.keyboard.press("Enter");
  }

  async enterUsername() {
    const { page, account } = this;

    console.log("waiting for username input...");
    await Promise.race([page.waitForSelector('input[type="text"]'), page.waitForSelector('input[name="username"]')]);
    console.log("typing username...");
    await page.type('input[type="text"]', account.username);
    await page.keyboard.press("Enter");
    console.log("waiting for password input...");

    const resp = await page.waitForResponse("https://api.twitter.com/1.1/onboarding/task.json");
    const body = await resp.json();
    console.log("enter username response", body);

    let shouldWaitForPasswordInput = false;

    if (
      body.subtasks.length &&
      (body.subtasks[0].subtask_id == "AccountDuplicationCheck" ||
        body.subtasks[0].subtask_id == "LoginEnterAlternateIdentifierSubtask")
    ) {
      await page.waitForSelector('input[type="text"]');
      shouldWaitForPasswordInput = await this.enterPhoneNumber();
    }

    return shouldWaitForPasswordInput ? page.waitForSelector('input[name="password"]') : null;
  }

  async enterPassword() {
    console.log("typing password...");

    const { page, account } = this;

    await page.type('input[name="password"]', account.password);
    await page.keyboard.press("Enter");
    const resp = await page.waitForResponse("https://api.twitter.com/1.1/onboarding/task.json");
    const body = await resp.json();

    const subtask = body.subtasks?.[0];
    if (subtask.subtask_id == "LoginAcid") return this.enterPhoneNumberOneMoreTime();
  }

  async login() {
    const { page, account } = this;

    await page.setExtraHTTPHeaders({
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
    });

    console.log("go to login page...");
    await page.goto("https://twitter.com/i/flow/login");
    await this.enterUsername();
    await this.enterPassword();

    console.log("getting tweets");
  }

  listenForNewPosts() {
    this.page.on("response", this.newPostsListener.bind(this));
  }

  removeListeners() {
    this.page.off("response", this.newPostsListener.bind(this));
  }

  async savePosts(posts: TweetData[] | any, users: any = [], task: any = "HOME_FOLLOWING_TAB") {
    let count = 0;
    try {
      for await (let post of posts) {
        const tweet: Tweet = post.legacy ? { ...post.legacy } : { ...post };
        if (!tweet.full_text) continue;
        const currencyKeywords = tweet.full_text.match(/\$([A-Za-z]{2,5})\b/g);
        if (currencyKeywords) {
          tweet.profile = users[tweet.user_id_str] || post.core.user_results.result.legacy;
          delete tweet.extended_entities;
          delete tweet.entities;
          const isShorten = tweet.full_text.length > 280 && tweet.full_text.slice(0, 280).endsWith("...");

          if (isShorten) {
            this.emit("shortened-post", post);
            continue;
          }
          // Store to DB

          delete tweet.profile.id;
          const [currencies, profile] = await Promise.all([
            CurrencyRepository.getCurrencyByKeywords(currencyKeywords),
            UserRepository.getOrCreate(
              { id_str: tweet.user_id_str },
              {
                ...tweet.profile,
                id: randomUUID(),
                id_str: tweet.user_id_str,
                created_at: new Date(tweet.profile.created_at).toISOString(),
                url: `https://twitter.com/${tweet.profile.screen_name}`,
              }
            ),
          ]);

          const path = `tweets/${new Date(tweet.created_at).toISOString().substring(0, 10)}/${profile.id_str}`;
          const path_json = `${path}/tweet_id_${tweet.id_str}.json`;
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
          }
          await TweetRepository.getOrCreate(
            { id_string: tweet.id_str },
            {
              id: randomUUID(),
              currencies: currencies,
              id_string: tweet.id_str,
              path_json: path_json,
              user_id: profile.id,
              campaign: typeof task == "string" ? task : "SEARCH_TAB",
              task: typeof task == "string" ? null : task,
              created_at: new Date(tweet.created_at),
              url_detail: `https://twitter.com/someone/status/${tweet.id_str}`,
            }
          );
          writeFileSync(path_json, JSON.stringify(tweet));
          count = count + 1;
        } else {
          console.log("Tweet failed", tweet);
        }

        // await request({
        //     url: '/tweets',
        //     method: 'POST',
        //     data: post
        // });
      }
      console.log(`Saved ${count} posts from ${typeof task == "string" ? task : "SEARCH_TAB"}`);

      return count;
    } catch (error) {
      console.error("savePosts", error);
    }
  }

  private async _getHomeTimeline(urlHome: string, headers: any) {
    try {
      const home = await axios.get(urlHome, {
        headers: headers,
      });
      const dataHome = home.data.data;
      const raw_entries: any[] = dataHome.home.home_timeline_urt.instructions[0].entries;
      const tweets: TweetData[] = raw_entries
        .slice(0, raw_entries.length - 2)
        .filter((entry: any) => {
          return entry?.content.entryType == "TimelineTimelineItem";
        })
        .map((entry: any, index) => {
          return entry?.content?.itemContent?.tweet_results?.result;
        });

      const cursor: CursorTweet[] = raw_entries
        .filter((entry: any) => entry?.content.entryType == "TimelineTimelineCursor")
        .map((entry: any) => entry?.content);

      const query = {
        count: 20,
        cursor: cursor[0].value,
        includePromotedContent: true,
        latestControlAvailable: true,
      };

      const query_feature = {
        rweb_lists_timeline_redesign_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: false,
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_media_download_video_enabled: false,
        responsive_web_enhance_cards_enabled: false,
      };

      const url = queryString.stringify({
        variables: JSON.stringify(query),
        features: JSON.stringify(query_feature),
        fieldToggles: JSON.stringify({
          withArticleRichContentState: false,
        }),
      });
      const urlObj = new URL(urlHome);
      urlObj.search = url;

      return {
        url: urlObj.toString(),
        cusor: cursor,
        tweets,
      };
    } catch (error) {
      console.log("_getHomeTimeline", error);
      throw error;
    }
  }

  async getTweetsFollowing() {
    setInterval(async () => {
      if (this.isReady) {
        try {
          const homeTweets = await this._getHomeTimeline(this.nextHomeURL, this.headers);
          await this.savePosts(homeTweets.tweets);
          this.nextHomeURL = homeTweets.url;
          console.log("Cursor", homeTweets.cusor[0].value);
        } catch (error) {
          this.isReady = false;
          axios
            .post(config.hook_event_url, {
              text: `#### Failed crawler from FOllOWING Tweets\n  please help me check this function getTweetsFollowing ${error}`,
            })
            .then();
        }
      }
    }, config.home_refresh);
  }

  private async _searchTweetsByKeyWord(
    keyword: string,
    cursor: string = "",
    fromDate: string,
    toDate: string
  ): Promise<any> {
    if (fromDate && toDate) {
      fromDate = new Date(fromDate).toISOString().substring(0, 10);
      toDate = new Date(toDate).toISOString().substring(0, 10);
    } else {
      const dateNow = new Date();
      const oneYearAgo = new Date(new Date().setFullYear(dateNow.getFullYear() - 1));
      fromDate = oneYearAgo.toISOString().substring(0, 10);
      toDate = dateNow.toISOString().substring(0, 10);
    }
    const parseKeyword = `${keyword} until:${toDate} since:${fromDate}`;
    console.log("Search: ", parseKeyword, "Cursor: ", cursor);
    try {
      let variables = { rawQuery: parseKeyword, count: 20, querySource: "", product: "Latest" } as any;
      if (cursor) variables["cursor"] = cursor;
      const queryParam: Record<string, any> = {
        variables: JSON.stringify(variables),
        features: JSON.stringify({
          rweb_lists_timeline_redesign_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          creator_subscriptions_tweet_preview_api_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: false,
          tweet_awards_web_tipping_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: true,
          responsive_web_media_download_video_enabled: false,
          responsive_web_enhance_cards_enabled: false,
        }),
        fieldToggles: JSON.stringify({ withArticleRichContentState: false }),
      };
      const searchParam = queryString.stringify(queryParam);
      const urlObj = new URL(this.searchURL);
      urlObj.search = searchParam;

      const pyFunc = await python("../libs/searchTweets.py");
      const dataRaw = await pyFunc.searchTweets(urlObj.toString(), this.headers);

      try {
        const statusResponse = await dataRaw.status_code;
        if (statusResponse > 200) {
          if (statusResponse == 429) {
            console.error("Too many requests", "Sleeping 5'");
            this.isReady = false;
            await sleep(this.TIME_WAITING);
            this.isReady = true;
            return this._searchTweetsByKeyWord(keyword, cursor, fromDate, toDate);
          } else {
            console.error("Request to Twitter failed", await dataRaw.text);
            axios
              .post(config.hook_event_url, {
                text: `#### Failed crawler from Search Tweets\n  please help me check this: ${await dataRaw.text}`,
              })
              .then();
          }
        }
      } catch (error) {
        console.error("Request from Python", await dataRaw);
        this.isReady = false;
        await sleep(this.TIME_WAITING);
        this.isReady = true;
        axios
          .post(config.hook_event_url, {
            text: `#### Failed crawler from Search Tweets\n  please help me check this`,
          })
          .then();
        return this._searchTweetsByKeyWord(keyword, cursor, fromDate, toDate);
        // Todo: handle error
      }

      // @ts-ignore
      // python.exit();
      const data = JSON.parse(await dataRaw.text);

      const raw_entries = data.data.search_by_raw_query.search_timeline.timeline.instructions[0].entries;
      let next_cursor;
      if (Array.isArray(raw_entries)) {
        next_cursor = raw_entries.filter((entry: any) => entry.entryId.includes("cursor-bottom"))[0];
      }

      if (!next_cursor) {
        for (
          let index = 1;
          index < data.data.search_by_raw_query.search_timeline.timeline.instructions.length;
          index++
        ) {
          if (
            data.data.search_by_raw_query.search_timeline.timeline.instructions[index].entry.entryId.includes(
              "cursor-bottom"
            )
          ) {
            next_cursor = data.data.search_by_raw_query.search_timeline.timeline.instructions[index].entry;
            break;
          }
        }
      }

      const tweets: TweetData[] = Array.isArray(raw_entries)
        ? raw_entries
            .filter((entry: any) => {
              return entry?.content.entryType == "TimelineTimelineItem";
            })
            .map((entry: any) => {
              return entry?.content?.itemContent?.tweet_results?.result;
            })
        : [];
      return {
        tweets: tweets,
        cursor: next_cursor,
      };
    } catch (error) {
      console.error("_searchTweetsByKeyWord", error);
      console.log(parseKeyword, cursor);
      axios
        .post(config.hook_event_url, {
          text: `#### Failed crawler from Search Tweets\n  please help me check this`,
        })
        .then();

      return {
        tweets: [],
        users: [],
        cursor: "",
      };
    }
  }

  async searchTweetsByKeyWord(
    keyword: string,
    cursor: string = "",
    taskObject: Task,
    fromDate: string,
    toDate: string
  ) {
    console.log("Task ", taskObject);
    let count = taskObject?.meta_data?.tweets || 0;
    let countEmptyDurable = 0;

    const result = await new Promise((resolve) => {
      const cron = setInterval(async () => {
        try {
          if (this.isReady) {
            const searchTweets = await this._searchTweetsByKeyWord(keyword, cursor, fromDate, toDate);
            cursor = searchTweets?.cursor?.content?.value || cursor;
            const tweetsSaved = await this.savePosts(searchTweets.tweets, [], taskObject);
            count = count + (tweetsSaved || 0);
            if (taskObject) {
              const metadata = { cursor, keyword, tweets: count, fromDate, toDate } as any;
              await TaskRepository.repository.update(taskObject.id, {
                meta_data: metadata,
              });
            }
            if (searchTweets.tweets.length == 0) {
              countEmptyDurable++;
              console.log("countEmptyDurable: ", countEmptyDurable);
            }
            if (searchTweets.tweets.length == 0 && countEmptyDurable > 10) {
              clearInterval(cron);
              resolve("Done");
            }
            if (searchTweets.tweets.length != 0) countEmptyDurable = 0;
          } else {
            console.log("The SEARCH is not ready");
          }
        } catch (error) {
          console.error("searchTweetsByKeyWord", error);
          axios
            .post(config.hook_event_url, {
              text: `#### Failed crawler from Search Tweets\n Please help me check this function searchTweetsByKeyWord ${error}`,
            })
            .then();
        }
      }, config.search_refresh);
    });
    return result;
  }

  // async saveProfiles(profiles: any[]) {
  //   for await (let profile of profiles) {
  //     await request({
  //       url: "/profiles",
  //       method: "POST",
  //       data: profile,
  //     });
  //   }
  // }

  async keepBrowsing(): Promise<void> {
    if (!this.isReady) {
      this.page.reload();
      if (!this.page.url().includes("/home") || this.isReady == false) {
        console.log("Logout");
        await this.startCrawler();
      }
      // console.log("navigate to explore...");
      // await this.cursor.click('a[href="/explore"]');
      // console.log("back to home...");
      // await sleep(5000);
      // await this.cursor.click('a[href="/home"]');
    }
    await sleep(300000);
    return this.keepBrowsing();
  }

  async gotoFollowingTab() {
    try {
      await this.page.waitForXPath("//div/div/span[text()='Following']");

      const [flowingTab] = await this.page.$x('//div/div/span[text()="Following"]');

      await flowingTab?.click();
    } catch (error) {
      console.log("Not found following tab");
    }
  }

  async getCredentials(response?: any) {
    if (!this.headers) {
      try {
        if (!response)
          response = await this.page.waitForResponse((url) => url.url().includes("/HomeLatestTimeline"), {
            timeout: 10000,
          });
        const cookies = await this.page.cookies();
        const cookies_string = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
        const header_request = response.request().headers();
        header_request["cookie"] = cookies_string;
        this.headers = header_request;
        this.nextHomeURL = response.url();
        this.isReady = true;
      } catch (error) {
        console.log("Credentials not found");
        this.isReady = false;
        await this.page.reload();
      }
    }
  }

  async getSearchUrl() {
    this.secondPage.on("request", async (request) => {
      const requestURL = request.url();
      if (requestURL.includes("/SearchTimeline")) {
        const rawUrl = new URL(requestURL);
        this.searchURL = rawUrl.origin + rawUrl.pathname;
      }
    });
    await this.secondPage.goto("https://twitter.com/search?q=test&src=recent_search_click");
    setTimeout(() => {
      console.log(this.searchURL);
      this.secondPage.close();
    }, 5000);
  }

  async startCrawler() {
    await this.page.goto("https://twitter.com/home");
    if (!this.page.url().includes("/home")) {
      await this.login();
    }
    console.log("logon");
    this.listenForNewPosts();
    if (this.headers) {
      this.isReady = true;
    }
    await this.gotoFollowingTab();

    // await this.getCredentials();
  }

  async watch() {
    await this.startCrawler();
    await this.getSearchUrl();
    await this.getTweetsFollowing();
    console.log("Get Home Timeline Started");
    // await this.searchTweetsByKeyWord("#pepe");
    // console.log("Search Tweets Started");

    this.keepBrowsing().then();
  }
}
