import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync Google Drive gallery",
  { minutes: 15 },
  internal.drive.syncScheduled,
  {},
);

export default crons;
