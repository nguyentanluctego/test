import axios from "axios";
import puppeteer from "puppeteer";
import queryString from "query-string";

import { CursorTweet, TweetData } from "./dto";
import { sleep } from "./utils";

const login = async (page: any) => {
  console.log("Logging in...");
  await Promise.race([page.waitForSelector('input[type="text"]'), page.waitForSelector('input[name="username"]')]);
  console.log("Typing username...");
  await page.type('input[type="text"]', "tanlucit");
  await page.keyboard.press("Enter");

  await page.waitForResponse("https://api.twitter.com/1.1/onboarding/task.json");
  console.log("Typing Password...");
  await page.type('input[name="password"]', "Luc01696408846");
  await page.keyboard.press("Enter");
  await page.waitForResponse("https://api.twitter.com/1.1/onboarding/task.json");
  console.log("Login successful!");
};

async function HomeTimeline(urlHome: string, headers: any) {
  const home = await axios.get(urlHome, {
    headers: headers,
  });

  const dataHome = home.data.data;
  const raw_entries: any[] = dataHome.home.home_timeline_urt.instructions[0].entries;

  const tweets: TweetData[] = raw_entries
    .slice(0, raw_entries.length - 2)
    .map((entry: any) => entry?.content?.itemContent?.tweet_results);

  const cusor: CursorTweet[] = raw_entries
    .slice(raw_entries.length - 2, raw_entries.length)
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

  const urlObj = new URL("");
  urlObj.search = "";
  const url = queryString.stringifyUrl({
    url: urlObj.toString(),
    query: { variables: JSON.stringify(query), features: JSON.stringify(query_feature) },
  });

  return {
    url,
    cusor,
    tweets,
  };
}

(async () => {
  const browser = await puppeteer.launch({
    // executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    // headless: false,
    slowMo: 100,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      // '--user-data-dir=/Users/user_name/Library/Application Support/Google/Chrome',
      // '--new-window',
      // '--profile-directory=Profile 7',
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote", // <- this one should be used with --no--sandbox
      "--disable-gpu",
    ],
    defaultViewport: {
      width: 1280,
      height: 720,
    },
  });

  const [page] = await browser.pages();
  const secondPage = await browser.newPage();

  await page.bringToFront();
  await login(page);
  const response = await page.waitForResponse((url) => url.url().includes("/HomeTimeline"), { timeout: 100000 });
  const cookies = await page.cookies();
  const cookies_string = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

  const header_request = response.request().headers();
  header_request["cookie"] = cookies_string;

  while (true) {
    const data = await HomeTimeline(response.url(), header_request);
    console.log(data.cusor[0].value, "Data: " + data.tweets.length);
    await sleep(30000);
  }
  //   const twitter = new Twitter(page, config.refreshCountReset, {
  //     username: config.username,
  //     password: config.password,
  //     phoneNumber: config.phoneNumber,
  //   });

  //   const tweetCrawling = new TweetCrawling(secondPage);

  //   twitter.on("shortened-post", (post) => tweetCrawling.queue(post));

  //   await twitter.watch();
})();
