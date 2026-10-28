/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminBootstrap from "../adminBootstrap.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as devSeed from "../devSeed.js";
import type * as drive from "../drive.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_drive from "../lib/drive.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_standings from "../lib/standings.js";
import type * as public_ from "../public.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminBootstrap: typeof adminBootstrap;
  auth: typeof auth;
  crons: typeof crons;
  devSeed: typeof devSeed;
  drive: typeof drive;
  "lib/auth": typeof lib_auth;
  "lib/drive": typeof lib_drive;
  "lib/scoring": typeof lib_scoring;
  "lib/settings": typeof lib_settings;
  "lib/standings": typeof lib_standings;
  public: typeof public_;
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
