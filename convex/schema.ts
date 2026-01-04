import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const leaks = defineTable({
  requiresLogin: v.optional(v.boolean()),
  isPaid: v.optional(v.boolean()),
  hasToolPrompts: v.optional(v.boolean()),
  accessNotes: v.optional(v.string()),
  leakText: v.string(),
  leakContext: v.optional(v.string()),
  url: v.optional(v.string()),
  targetType: v.union(
    v.literal("model"),
    v.literal("app"),
    v.literal("tool"),
    v.literal("agent"),
    v.literal("plugin"),
    v.literal("custom"),
  ),
  targetName: v.string(),
  provider: v.string(),
  submittedBy: v.optional(v.id("users")),
  verifiedBy: v.optional(v.array(v.id("users"))),
  isFullyVerified: v.boolean(),
  requestId: v.optional(v.id("requests")),
})
  // Index for filtering by verification status (used in getVerifiedLeaks, getUnverifiedLeaks)
  .index("by_isFullyVerified", ["isFullyVerified"])
  // Compound index for filtering verified leaks by provider (used in getLeaksByProvider, getProviders)
  .index("by_provider_and_verified", ["provider", "isFullyVerified"]);

const requests = defineTable({
  targetName: v.string(),
  provider: v.string(),
  targetType: v.union(
    v.literal("model"),
    v.literal("app"),
    v.literal("tool"),
    v.literal("agent"),
    v.literal("plugin"),
    v.literal("custom"),
  ),
  targetUrl: v.string(),
  closed: v.boolean(),
  closedBy: v.optional(v.union(v.literal("user"), v.literal("verification"))),
  leaks: v.array(v.id("leaks")),
  submittedBy: v.id("users"),
})
  .index("by_closed", ["closed"])
  .index("by_submittedBy_and_closed", ["submittedBy", "closed"])
  .searchIndex("search_targetName", {
    searchField: "targetName",
    filterFields: ["closed"],
  });

const users = defineTable({
  name: v.string(),
  image: v.string(),
  email: v.string(),
  requests: v.optional(v.array(v.id("requests"))),
  leaks: v.optional(v.array(v.id("leaks"))),
  points: v.number(), // TODO: Add points system
  // Links to the auth tables - this will be set automatically by Convex Auth
  // when a user signs in
})
  .index("email", ["email"])
  .index("by_points", ["points"]);

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  leaks,
  requests,
  users,
});
