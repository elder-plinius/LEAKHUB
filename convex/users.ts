import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the current user's information including their image.
 * Returns null if the user is not authenticated.
 */
export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      image: v.string(),
      email: v.string(),
      points: v.number(),
      requests: v.optional(v.array(v.id("requests"))),
      leaks: v.optional(v.array(v.id("leaks"))),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    return user;
  },
});

/**
 * Get comprehensive dashboard data for a specific user including:
 * - User profile information
 * - Points and rank
 * - User's leaks
 * - User's requests
 */
export const getUserDashboardData = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      name: v.string(),
      email: v.string(),
      points: v.number(),
      rank: v.number(),
      totalUsers: v.number(),
      leaks: v.array(
        v.object({
          _id: v.id("leaks"),
          _creationTime: v.number(),
          targetName: v.string(),
          targetType: v.union(
            v.literal("model"),
            v.literal("app"),
            v.literal("tool"),
            v.literal("agent"),
            v.literal("plugin"),
            v.literal("custom"),
          ),
          provider: v.string(),
          isFullyVerified: v.boolean(),
          requestId: v.optional(v.id("requests")),
        }),
      ),
      requests: v.array(
        v.object({
          _id: v.id("requests"),
          _creationTime: v.number(),
          targetName: v.string(),
          targetType: v.union(
            v.literal("model"),
            v.literal("app"),
            v.literal("tool"),
            v.literal("agent"),
            v.literal("plugin"),
            v.literal("custom"),
          ),
          provider: v.string(),
          closed: v.boolean(),
          targetUrl: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Calculate user's rank based on points
    const usersQuery = ctx.db
      .query("users")
      .withIndex("by_points")
      .order("desc");

    let rank = 0;
    let totalUsers = 0;
    let userRank = 0;

    for await (const u of usersQuery) {
      rank += 1;
      totalUsers += 1;
      if (u._id === args.userId) {
        userRank = rank;
      }
    }

    // Fetch full leak documents
    const leakDocs: Array<{
      _id: Id<"leaks">;
      _creationTime: number;
      targetName: string;
      targetType: "model" | "app" | "tool" | "agent" | "plugin" | "custom";
      provider: string;
      isFullyVerified: boolean;
      requestId?: Id<"requests">;
    }> = [];
    if (user.leaks) {
      for (const leakId of user.leaks) {
        const leak = await ctx.db.get(leakId);
        if (leak) {
          leakDocs.push({
            _id: leak._id,
            _creationTime: leak._creationTime,
            targetName: leak.targetName,
            targetType: leak.targetType,
            provider: leak.provider,
            isFullyVerified: leak.isFullyVerified,
            requestId: leak.requestId,
          });
        }
      }
    }

    // Fetch full request documents
    const requestDocs: Array<{
      _id: Id<"requests">;
      _creationTime: number;
      targetName: string;
      targetType: "model" | "app" | "tool" | "agent" | "plugin" | "custom";
      provider: string;
      closed: boolean;
      targetUrl?: string;
    }> = [];
    if (user.requests) {
      for (const requestId of user.requests) {
        const request = await ctx.db.get(requestId);
        if (request) {
          requestDocs.push({
            _id: request._id,
            _creationTime: request._creationTime,
            targetName: request.targetName,
            targetType: request.targetType,
            provider: request.provider,
            closed: request.closed,
            targetUrl: request.targetUrl,
          });
        }
      }
    }

    return {
      name: user.name,
      email: user.email,
      points: user.points,
      rank: userRank,
      totalUsers: totalUsers,
      leaks: leakDocs,
      requests: requestDocs,
    };
  },
});

