interface Url {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: [number, number];
}

interface Entities {
  description: {
    urls: Url[];
  };
  url: {
    urls: Url[];
  };
}

interface Legacy {
  can_dm: boolean;
  can_media_tag: boolean;
  created_at: string;
  default_profile: boolean;
  default_profile_image: boolean;
  description: string;
  entities: Entities;
  fast_followers_count: number;
  favourites_count: number;
  followers_count: number;
  friends_count: number;
  has_custom_timelines: boolean;
  is_translator: boolean;
  listed_count: number;
  location: string;
  media_count: number;
  name: string;
  normal_followers_count: number;
  pinned_tweet_ids_str: string[];
  possibly_sensitive: boolean;
  profile_banner_url: string;
  profile_image_url_https: string;
  profile_interstitial_type: string;
  screen_name: string;
  statuses_count: number;
  translator_type: string;
  url: string;
  verified: boolean;
  want_retweets: boolean;
  withheld_in_countries: any[];
}

interface Category {
  id: number;
  name: string;
  icon_name: string;
}

interface Professional {
  rest_id: string;
  professional_type: string;
  category: Category[];
}

interface Result {
  __typename: string;
  id: string;
  rest_id: string;
  affiliates_highlighted_label: object;
  has_graduated_access: boolean;
  is_blue_verified: boolean;
  profile_image_shape: string;
  legacy: Legacy;
  professional: Professional;
}

interface UserResults {
  result: Result;
}

interface Core {
  user_results: UserResults;
}

interface EditControl {
  edit_tweet_ids: string[];
  editable_until_msecs: string;
  is_edit_eligible: boolean;
  edits_remaining: string;
}

interface EditPerspective {
  favorited: boolean;
  retweeted: boolean;
}

interface Views {
  count: string;
  state: string;
}

interface UserMention {
  id_str: string;
  name: string;
  screen_name: string;
  indices: [number, number];
}

interface Hashtag {
  indices: [number, number];
  text: string;
}

interface Mention {
  user_mentions: UserMention[];
  urls: any[];
  hashtags: Hashtag[];
  symbols: any[];
}

interface Media {
  display_url: string;
  expanded_url: string;
  id_str: string;
  indices: [number, number];
  media_key: string;
  media_url_https: string;
  type: string;
  url: string;
  ext_media_availability: {
    status: string;
  };
}

interface ExtendedEntities {
  media: Media[];
}

export interface Tweet {
  bookmark_count: number;
  bookmarked: boolean;
  created_at: string;
  display_text_range: []
  conversation_id_str: string;
  entities: Mention;
  extended_entities: ExtendedEntities;
  favorite_count: number;
  favorited: boolean;
  full_text: string;
  is_quote_status: boolean;
  lang: string;
  possibly_sensitive: boolean;
  possibly_sensitive_editable: boolean;
  quote_count: number;
  reply_count: number;
  retweet_count: number;
  retweeted: boolean;
  user_id_str: string;
  id_str: string;
  // Profile data 
  profile?: any;
}

export interface TweetData {
  __typename: string;
  rest_id: string;
  core: Core;
  unmention_data: object;
  edit_control: EditControl;
  edit_perspective: EditPerspective;
  is_translatable: boolean;
  views: Views;
  legacy: Tweet;
}

export interface CursorTweet {
  value: string;
  cursorType: string;
}
