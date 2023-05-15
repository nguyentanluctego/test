import axios from "axios";
import { TweetData, CursorTweet } from "./dto";
import queryString from "query-string";
import { Dataset, PuppeteerCrawler } from "crawlee";

async function requestHandler(page: any) {
  await page.goto("https://twitter.com/login");
  await page.type('input[name="session[username_or_email]"]', "your_username");
  await page.type('input[name="session[password]"]', "your_password");
  await page.click('div[data-testid="LoginForm_Login_Button"]');
  await page.waitForNavigation();
  await page.goto("https://twitter.com/search?q=python&src=typed_query");
  const tweets = await page.$$(".css-1dbjc4n.r-18u37iz.r-1wtj0ep.r-156q2ks.r-1mdbhws");
  for (const tweet of tweets) {
    console.log(await tweet.innerText());
  }
}

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

const crawler = new PuppeteerCrawler({
  requestHandlerTimeoutSecs: 1000,
  async requestHandler({ page, request }) {
    await page.setExtraHTTPHeaders({
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
    });
    // login step
    await login(page);
    // Get tweets
    let a = 1;
    while (true) {
      const response = await page.waitForResponse((url) => url.url().includes("/HomeTimeline"), { timeout: 100000 });
      const cookies = await page.cookies();
      console.log(a + ":", await response.json());
      a++;
    }
    // const cookies_string = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");

    // const header_request = response.request().headers();
    // header_request["cookie"] = cookies_string;
    // const home = await axios.get(response.url(), {
    //   headers: header_request,
    // });
    // const dataHome = home.data.data;
    // const raw_tweets: [] = dataHome.home.home_timeline_urt.instructions[0].entries;
    // const tweets = raw_tweets.map((entry: any) => entry?.content?.itemContent?.tweet_results);
    // console.log(tweets);
  },
});
// crawler.addRequests(["https://twitter.com/i/flow/login"]);
// crawler.run();
async function HomeTimeline(urlHome: string, headers: any) {
  const home = await axios.get(
    urlHome ||
      "https://twitter.com/i/api/graphql/Yw1pKqHDSlwP4RIHPVA1gg/HomeTimeline?variables=%7B%22count%22%3A40%2C%22cursor%22%3A%22DAABCgABFv1vPJ1AJxEKAAIW-yYDVNZwAwgAAwAAAAEAAA%22%2C%22includePromotedContent%22%3Atrue%2C%22latestControlAvailable%22%3Atrue%2C%22withCommunity%22%3Atrue%7D&features=%7B%22rweb_lists_timeline_redesign_enabled%22%3Afalse%2C%22blue_business_profile_image_shape_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22vibe_api_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse%2C%22interactive_text_enabled%22%3Atrue%2C%22responsive_web_text_conversations_enabled%22%3Afalse%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Afalse%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D",
    {
      headers: headers || {
        "x-twitter-client-language": "en",
        "x-csrf-token":
          "72e309d0392ecfdca3cf09187444d0fa29b02b845d56437e1735237caed4c336da4e89840b3f78a27603f4681e981030e471033e5a42fcba887371b082dc30d77d9f7deb518a6a44030cf16e0f075521",
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        referer: "https://twitter.com/home",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-active-user": "yes",
        Cookie:
          'personalization_id="v1_JZnjKqa/kCX1wCh1eNk5Cg=="; guest_id_ads=v1%3A168404072907181715; att=1-Cn8ABtTMf5fI1nOZCJnwfoxrqcF0kcBkJrNFLImW; auth_token=0456e42726dc61811c223f3f2b5d91f5498e2031; ct0=72e309d0392ecfdca3cf09187444d0fa29b02b845d56437e1735237caed4c336da4e89840b3f78a27603f4681e981030e471033e5a42fcba887371b082dc30d77d9f7deb518a6a44030cf16e0f075521; lang=en; kdt=A5nETA8bPXwhNh1dhy03RUtkQL92hK1omWzCHgzE; _gid=GA1.2.425122898.1684040731; twid=u%3D1656566796798013440; guest_id=v1%3A168404072907181715; guest_id_marketing=v1%3A168404072907181715; _twitter_sess=BAh7CSIKZmxhc2hJQzonQWN0aW9uQ29udHJvbGxlcjo6Rmxhc2g6OkZsYXNo%250ASGFzaHsABjoKQHVzZWR7ADoPY3JlYXRlZF9hdGwrCC5EphiIAToMY3NyZl9p%250AZCIlNDcyMzI1ZGI4ZDZkNTU3MjlkZTE0MzUwYzVmNzcxMmM6B2lkIiUxN2Uz%250AMjgwMTY4Y2U0ZWI3NjcwNTA5YmQ1MmQ0ODQ5NQ%253D%253D--093b00537377057155c372d88edeea62bed72108; _ga=GA1.2.359464599.1684040731',
      },
    }
  );

  const urlObj = new URL("");
  urlObj.search = "";

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

// coin tweet {
//   path: "tweet1.json",
//   key: "$BTC, @BTC, bitcoin"
// }
// pattern = > $~5character
// $Trump

// => {
//   * count by profile
//   * Top coin recent
//   * top coin mention
// }
