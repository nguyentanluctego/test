import axios from "axios";
import { EventEmitter } from "events";
import { GhostCursor, createCursor } from "ghost-cursor";
import queryString from "node:querystring";
import { HTTPResponse, Page } from "puppeteer";
import { scrollPageToTop } from "puppeteer-autoscroll-down";
import { CursorTweet, Tweet, TweetData } from "./dto";
import { request } from "./request";
import { sleep } from "./utils";
import { writeFileSync } from "fs";

export class Twitter extends EventEmitter {
  private cursor: GhostCursor;
  private refreshCount = 0;
  private originalHomeURL = "";
  private nextHomeURL = "";
  private headers = {};

  constructor(
    private readonly page: Page,
    private readonly refreshCountReset: number,
    private readonly account: {
      username: string;
      password: string;
      phoneNumber: string;
    }
  ) {
    super();

    this.cursor = createCursor(page);
    this.cursor.toggleRandomMove(true);
    this.page.setRequestInterception(true);
    this.page.on("request", (req) => {
      if (req.url() == "https://api.twitter.com/1.1/onboarding/task.json" && req.method() == "POST") {
        console.log(JSON.parse(req.postData() as string).subtask_inputs[0]);
      }
      // if (req.resourceType() === "image") {
      //   req.abort();
      // }
      req.continue();
    });
  }

  async newPostsListener(resp: HTTPResponse) {
    const url = resp.url();
    if (!url.includes("/HomeTimeline")) return;

    const body = await resp.json();
    const raw_entries: any[] = body.data.home.home_timeline_urt.instructions[0].entries;
    const tweets: TweetData[] = raw_entries
      .slice(0, raw_entries.length - 2)
      .filter((entry: any) => entry?.content.entryType == "TimelineTimelineItem")
      .map((entry: any, index) => {
        if (!entry?.content?.itemContent?.tweet_results?.result) console.log("Tào lao: ", index, entry);
        return entry?.content?.itemContent?.tweet_results?.result;
      });
    console.log("New tweets");

    // await this.savePosts(tweets);
    // await this.saveProfiles(Object.values(body.globalObjects.users));
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
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
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

  async savePosts(posts: TweetData[]) {
    // const tweets: Tweet[] = [];
    for await (let post of posts) {
      try {
        const tweet: Tweet = { ...post.legacy };
        tweet.profile = post.core.user_results.result.legacy;
        const isShorten = tweet.full_text.length > 280 && tweet.full_text.slice(0, 280).endsWith("...");

        if (isShorten) {
          this.emit("shortened-post", post);
          continue;
        }
        writeFileSync(`tweets/post ${tweet.id_str}.json`, JSON.stringify(tweet));
        // console.log("saving post 1", tweet);
      } catch (error) {
        console.log("error", error);
      }

      // await request({
      //     url: '/tweets',
      //     method: 'POST',
      //     data: post
      // });
    }
  }

  private async _getHomeTimeline(urlHome: string, headers: any) {
    const home = await axios.get(urlHome, {
      headers: headers,
    });

    const dataHome = home.data.data;
    const raw_entries: any[] = dataHome.home.home_timeline_urt.instructions[0].entries;
    const tweets: TweetData[] = raw_entries
      .slice(0, raw_entries.length - 2)
      .filter((entry: any) => entry?.content.entryType == "TimelineTimelineItem")
      .map((entry: any, index) => {
        if (!entry?.content?.itemContent?.tweet_results?.result) console.log("Tào lao: ", index, entry);
        return entry?.content?.itemContent?.tweet_results?.result;
      });

    const cusor: CursorTweet[] = raw_entries
      .filter((entry: any) => entry?.content.entryType == "TimelineTimelineCursor")
      .map((entry: any) => entry?.content);

    const query = {
      count: 40,
      cursor: cusor[0].value,
      includePromotedContent: true,
      latestControlAvailable: true,
      withCommunity: true,
    };

    const query_feature = {
      rweb_lists_timeline_redesign_enabled: false,
      blue_business_profile_image_shape_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      tweetypie_unmention_optimization_enabled: true,
      vibe_api_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
      interactive_text_enabled: true,
      responsive_web_text_conversations_enabled: false,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: false,
      responsive_web_enhance_cards_enabled: false,
    };

    const url = queryString.stringify({
      variables: JSON.stringify(query),
      features: JSON.stringify(query_feature),
    });
    const urlObj = new URL(urlHome);
    urlObj.search = url;

    return {
      url: urlObj.toString(),
      cusor,
      tweets,
    };
  }

  async getHomeTimeLine() {
    const response = await this.page.waitForResponse((url) => url.url().includes("/HomeTimeline"), { timeout: 10000 });
    const cookies = await this.page.cookies();
    const cookies_string = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    const header_request = response.request().headers();
    header_request["cookie"] = cookies_string;
    this.headers = header_request;
    this.originalHomeURL = response.url();
    this.nextHomeURL = response.url();
    setInterval(async () => {
      const homeTweets = await this._getHomeTimeline(this.nextHomeURL, header_request);
      await this.savePosts(homeTweets.tweets);
      this.nextHomeURL = homeTweets.url;
      console.log("Cursor", homeTweets.cusor[0].value);
    }, 10000);
  }

  private async _searchTweetsByKeyWord(keyword: string, cursor: string) {
    const queryParam: Record<string, any> = {
      include_profile_interstitial_type: 1,
      include_blocking: 1,
      include_blocked_by: 1,
      include_followed_by: 1,
      include_want_retweets: 1,
      include_mute_edge: 1,
      include_can_dm: 1,
      include_can_media_tag: 1,
      include_ext_has_nft_avatar: 1,
      include_ext_is_blue_verified: 1,
      include_ext_verified_type: 1,
      include_ext_profile_image_shape: 1,
      skip_status: 1,
      cards_platform: "Web-12",
      include_cards: 1,
      include_ext_alt_text: true,
      include_ext_limited_action_results: false,
      include_quote_count: true,
      include_reply_count: 1,
      tweet_mode: "extended",
      include_ext_views: true,
      include_entities: true,
      include_user_entities: true,
      include_ext_media_color: true,
      include_ext_media_availability: true,
      include_ext_sensitive_media_warning: true,
      include_ext_trusted_friends_metadata: true,
      send_error_codes: true,
      simple_quoted_tweet: true,
      q: keyword,
      tweet_search_mode: "live",
      query_source: "typed_query",
      count: 20,
      requestContext: "launch",
      pc: 1,
      spelling_corrections: 1,
      include_ext_edit_control: true,
      ext: "mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,enrichments,superFollowMetadata,unmentionInfo,editControl,vibe",
    };
    if (cursor) queryParam["cursor"] = cursor;
    const url = queryString.stringify(queryParam);
    const searchURL = "https://twitter.com/i/api/2/search/adaptive.json";
    const urlObj = new URL(searchURL);
    urlObj.search = url;

    const data = await axios.get(urlObj.toString(), { headers: this.headers });
    return {
      tweets: data.data.globalObjects.tweets,
      users: data.data.globalObjects.users,
      cursor: data.data.timeline.instructions[0].addEntries.entries,
    };
  }

  async saveProfiles(profiles: any[]) {
    for await (let profile of profiles) {
      await request({
        url: "/profiles",
        method: "POST",
        data: profile,
      });
    }
  }

  async keepBrowsing(): Promise<void> {
    if (this.refreshCount >= this.refreshCountReset) {
      console.log("reloading...");
      await this.removeListeners();
      await this.page.reload();
      await this.listenForNewPosts();
      this.refreshCount = 0;
      return this.keepBrowsing();
    }
    await sleep(5000);
    this.page.reload();
    // console.log("navigate to explore...");
    // await this.cursor.click('a[href="/explore"]');
    // console.log("back to home...");
    // await sleep(5000);
    // await this.cursor.click('a[href="/home"]');
    await sleep(5000);
    this.refreshCount++;
    return this.keepBrowsing();
  }

  async autoScroll() {
    setInterval(async () => {
      await scrollPageToTop(this.page, { size: 50, delay: 250 });
    }, 500);
  }

  async watch() {
    await this.login();
    console.log("logon");
    await this.getHomeTimeLine();
    // this.listenForNewPosts();
    // await this.autoScroll();
    // await this.keepBrowsing();
  }
}
