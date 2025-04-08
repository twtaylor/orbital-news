/**
 * Types for the Reddit API service
 */

/**
 * Response from Reddit OAuth token endpoint
 */
export interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Reddit post data structure
 */
export interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  url: string;
  author: string;
  created_utc: number;
  permalink: string;
  link_flair_text?: string;
  score: number;
  num_comments: number;
  [key: string]: any; // For other properties we might need
}

/**
 * Reddit API response structure for post listings
 */
export interface RedditPostData {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
    after: string | null;
    before: string | null;
  };
}
