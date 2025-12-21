import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get leaderboard data including:
 * - Top 10 users by points
 * - Current user's rank (if not in top 10)
 * - Total number of users
 */
export const getLeaderboard = query({
  args: {},
  returns: v.object({
    topUsers: v.array(
      v.object({
        _id: v.id("users"),
        name: v.string(),
        image: v.string(),
        points: v.number(),
        rank: v.number(),
        isCurrentUser: v.boolean(),
      }),
    ),
    currentUserRank: v.union(
      v.object({
        _id: v.id("users"),
        name: v.string(),
        image: v.string(),
        points: v.number(),
        rank: v.number(),
      }),
      v.null(),
    ),
    totalUsers: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    const usersQuery = ctx.db
      .query("users")
      .withIndex("by_points")
      .order("desc");

    const topUsers: Array<{
      _id: Id<"users">;
      name: string;
      image: string;
      points: number;
      rank: number;
      isCurrentUser: boolean;
    }> = [];

    let currentUserRank: {
      _id: Id<"users">;
      name: string;
      image: string;
      points: number;
      rank: number;
    } | null = null;

    let rank = 0;

    for await (const user of usersQuery) {
      rank += 1;
      const isCurrentUser = userId !== null && user._id === userId;

      if (rank <= 10) {
        topUsers.push({
          _id: user._id,
          name: user.name,
          image: user.image,
          points: user.points,
          rank,
          isCurrentUser,
        });
      }

      if (isCurrentUser && rank > 10) {
        currentUserRank = {
          _id: user._id,
          name: user.name,
          image: user.image,
          points: user.points,
          rank,
        };
      }
    }

    const totalUsers = rank;

    return {
      topUsers,
      currentUserRank,
      totalUsers,
    };
  },
});

