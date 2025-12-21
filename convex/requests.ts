import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get all open (non-closed) requests from the database.
 * Returns requests with submitter names populated.
 */
export const getOpenRequests = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("requests"),
      _creationTime: v.number(),
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
      submittedBy: v.id("users"),
      submitterName: v.string(),
      leaks: v.array(v.id("leaks")),
    }),
  ),
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_closed", (q) => q.eq("closed", false))
      .order("desc")
      .collect();

    // Fetch submitter names
    const requestsWithNames: Array<{
      _id: Id<"requests">;
      _creationTime: number;
      targetName: string;
      provider: string;
      targetType: "model" | "app" | "tool" | "agent" | "plugin" | "custom";
      targetUrl: string;
      closed: boolean;
      submittedBy: Id<"users">;
      submitterName: string;
      leaks: Array<Id<"leaks">>;
    }> = [];

    for (const request of requests) {
      const user = await ctx.db.get(request.submittedBy);
      requestsWithNames.push({
        ...request,
        submitterName: user?.name || "Unknown",
      });
    }

    return requestsWithNames;
  },
});

/**
 * Get all open requests for a specific user.
 * Returns only requests that belong to the specified user and are not closed.
 */
export const getUserOpenRequests = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("requests"),
      _creationTime: v.number(),
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
      submittedBy: v.id("users"),
      leaks: v.array(v.id("leaks")),
    }),
  ),
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_submittedBy_and_closed", (q) =>
        q.eq("submittedBy", args.userId).eq("closed", false),
      )
      .order("desc")
      .collect();
    return requests;
  },
});

/**
 * Create a new request for a leak target.
 * Validates that:
 * - User is authenticated
 * - No duplicate request exists (case-insensitive)
 * - User has less than 3 open requests
 *
 * Returns a result object with success status and error message if validation fails.
 * This prevents "Uncaught" errors in the terminal logs.
 */
export const createRequest = mutation({
  args: {
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
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      requestId: v.id("requests"),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        success: false as const,
        error: "You must be logged in to create a request",
      };
    }

    // Check if a request with the same target name already exists (case-insensitive)
    // Query ALL requests, not just open ones
    const allRequests = await ctx.db.query("requests").collect();
    const normalizedTargetName = args.targetName.toLowerCase().trim();

    const existingRequest = allRequests.find(
      (req) => req.targetName.toLowerCase().trim() === normalizedTargetName,
    );

    if (existingRequest) {
      return {
        success: false as const,
        error: `A request for "${existingRequest.targetName}" has already been made. Please search for it in the existing requests.`,
      };
    }

    // Check if user already has 3 or more open requests
    const userOpenRequests = await ctx.db
      .query("requests")
      .withIndex("by_submittedBy_and_closed", (q) =>
        q.eq("submittedBy", userId).eq("closed", false),
      )
      .collect();

    if (userOpenRequests.length >= 3) {
      return {
        success: false as const,
        error:
          "You have reached the maximum limit of 3 open requests. Please wait for some to be fulfilled before creating more.",
      };
    }

    const requestId = await ctx.db.insert("requests", {
      targetName: args.targetName,
      provider: args.provider.toUpperCase(), // Convert provider to uppercase for consistency
      targetType: args.targetType,
      targetUrl: args.targetUrl,
      closed: false,
      leaks: [],
      submittedBy: userId,
    });

    // Update user's requests array
    const user = await ctx.db.get(userId);
    if (user) {
      const currentRequests = user.requests || [];
      await ctx.db.patch(userId, {
        requests: [...currentRequests, requestId],
      });
    }

    return { success: true as const, requestId };
  },
});

/**
 * Close a request (mark it as closed).
 * Only the owner of the request can close it.
 * Validates that:
 * - User is authenticated
 * - Request exists
 * - User owns the request
 * - Request is not already closed
 *
 * Returns a result object with success status and error message if validation fails.
 * This prevents "Uncaught" errors in the terminal logs.
 */
export const closeRequest = mutation({
  args: {
    requestId: v.id("requests"),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        success: false as const,
        error: "You must be logged in to close a request",
      };
    }

    // Get the request to verify ownership
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return {
        success: false as const,
        error: "Request not found",
      };
    }

    // Check if the user is the owner of the request
    if (request.submittedBy !== userId) {
      return {
        success: false as const,
        error: "You can only close your own requests",
      };
    }

    // Check if the request is already closed
    if (request.closed) {
      return {
        success: false as const,
        error: "Request is already closed",
      };
    }

    // Close the request
    await ctx.db.patch(args.requestId, {
      closed: true,
    });

    return { success: true as const };
  },
});

/**
 * Search for existing requests by target name.
 * Uses full-text search to find matching requests.
 * Only returns open (non-closed) requests.
 * Returns up to 10 results.
 */
export const searchRequests = query({
  args: {
    searchQuery: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("requests"),
      _creationTime: v.number(),
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
      submittedBy: v.id("users"),
      submitterName: v.string(),
      leaks: v.array(v.id("leaks")),
    }),
  ),
  handler: async (ctx, args) => {
    if (!args.searchQuery || args.searchQuery.trim() === "") {
      return [];
    }

    const requests = await ctx.db
      .query("requests")
      .withSearchIndex("search_targetName", (q) =>
        q.search("targetName", args.searchQuery).eq("closed", false),
      )
      .take(10);

    const requestsWithNames: Array<{
      _id: Id<"requests">;
      _creationTime: number;
      targetName: string;
      provider: string;
      targetType: "model" | "app" | "tool" | "agent" | "plugin" | "custom";
      targetUrl: string;
      closed: boolean;
      submittedBy: Id<"users">;
      submitterName: string;
      leaks: Array<Id<"leaks">>;
    }> = [];

    for (const request of requests) {
      const user = await ctx.db.get(request.submittedBy);
      requestsWithNames.push({
        ...request,
        submitterName: user?.name || "Unknown",
      });
    }

    return requestsWithNames;
  },
});

/**
 * Get all open requests with their verification status.
 * Returns requests with:
 * - Request information
 * - Number of leak confirmations
 * - Number of unique submitters
 * - Submitter name
 */
export const getRequestsWithVerificationStatus = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("requests"),
      _creationTime: v.number(),
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
      submittedBy: v.id("users"),
      submitterName: v.string(),
      leaks: v.array(v.id("leaks")),
      confirmationCount: v.number(),
      uniqueSubmitters: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_closed", (q) => q.eq("closed", false))
      .order("desc")
      .collect();

    const requestsWithStatus: Array<{
      _id: Id<"requests">;
      _creationTime: number;
      targetName: string;
      provider: string;
      targetType: "model" | "app" | "tool" | "agent" | "plugin" | "custom";
      targetUrl: string;
      closed: boolean;
      submittedBy: Id<"users">;
      submitterName: string;
      leaks: Array<Id<"leaks">>;
      confirmationCount: number;
      uniqueSubmitters: number;
    }> = [];

    for (const request of requests) {
      const user = await ctx.db.get(request.submittedBy);

      // Calculate unique submitters
      const submitters = new Set<Id<"users">>();
      for (const leakId of request.leaks) {
        const leak = await ctx.db.get(leakId);
        if (leak && leak.submittedBy) {
          submitters.add(leak.submittedBy);
        }
      }

      requestsWithStatus.push({
        ...request,
        submitterName: user?.name || "Unknown",
        confirmationCount: request.leaks.length,
        uniqueSubmitters: submitters.size,
      });
    }

    return requestsWithStatus;
  },
});
