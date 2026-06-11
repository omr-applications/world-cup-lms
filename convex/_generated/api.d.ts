/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as groups from "../groups.js";
import type * as host from "../host.js";
import type * as http from "../http.js";
import type * as matches from "../matches.js";
import type * as pickWindows from "../pickWindows.js";
import type * as picks from "../picks.js";
import type * as results from "../results.js";
import type * as rules from "../rules.js";
import type * as scoreFeed from "../scoreFeed.js";
import type * as scores from "../scores.js";
import type * as seed from "../seed.js";
import type * as selectionResets from "../selectionResets.js";
import type * as standings from "../standings.js";
import type * as tournaments from "../tournaments.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  crons: typeof crons;
  groups: typeof groups;
  host: typeof host;
  http: typeof http;
  matches: typeof matches;
  pickWindows: typeof pickWindows;
  picks: typeof picks;
  results: typeof results;
  rules: typeof rules;
  scoreFeed: typeof scoreFeed;
  scores: typeof scores;
  seed: typeof seed;
  selectionResets: typeof selectionResets;
  standings: typeof standings;
  tournaments: typeof tournaments;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
