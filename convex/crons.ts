import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync active World Cup scores",
  { minutes: 10 },
  internal.scores.syncActiveGroupsFromFeed,
  {},
);

crons.interval(
  "sync World Cup fixtures",
  { hours: 12 },
  internal.scores.syncFixturesFromFeed,
  {},
);

export default crons;
