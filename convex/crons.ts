import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily( 
  "delete closed requests after a day",
  { hourUTC: 1, minuteUTC: 0 },
  internal.requests.deleteOldClosedRequests
);

export default crons;