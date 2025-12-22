import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

/**
 * Helper function to normalize text for comparison.
 * Removes extra whitespace, converts to lowercase, and trims.
 * This allows for minor formatting differences while ensuring content matches.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, "\n"); // Normalize multiple newlines
}

/**
 * Calculate Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits required
 * to change one string into another.
 */
const SHINGLE_SIZE = 4;
const SHINGLE_THRESHOLD = 0.6;

/**
 * Build a shingle frequency vector from normalized text.
 * Uses overlapping n-grams to preserve ordering context while
 * keeping memory footprint linear in the input size.
 */
function buildShingleVector(text: string): Map<string, number> {
  const vector = new Map<string, number>();
  const tokens = text.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return vector;
  }

  for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
    const shingle = tokens.slice(i, i + SHINGLE_SIZE).join(" ");
    vector.set(shingle, (vector.get(shingle) ?? 0) + 1);
  }

  // For very short texts fall back to single tokens so we don't return 0 shingles.
  if (vector.size === 0) {
    for (const token of tokens) {
      vector.set(token, (vector.get(token) ?? 0) + 1);
    }
  }

  return vector;
}

/**
 * Compute cosine similarity between two shingle frequency vectors.
 * This is our lightweight filter to discard obviously different leaks.
 */
function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>,
): number {
  if (vecA.size === 0 || vecB.size === 0) {
    return vecA.size === vecB.size ? 1 : 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const value of vecA.values()) {
    magA += value * value;
  }
  for (const value of vecB.values()) {
    magB += value * value;
  }

  // Iterate over smaller vector for efficiency.
  const [smaller, larger] =
    vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];
  for (const [term, value] of smaller.entries()) {
    const other = larger.get(term);
    if (other !== undefined) {
      dot += value * other;
    }
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / Math.sqrt(magA * magB);
}

/**
 * Memory-efficient Levenshtein similarity that stores only two rows of the DP
 * matrix. This reduces peak memory to O(min(len1, len2)).
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) {
    return 1;
  }
  if (len1 === 0 || len2 === 0) {
    return 0;
  }

  // Ensure str2 is the shorter string for smaller buffers.
  if (len2 > len1) {
    return levenshteinSimilarity(str2, str1);
  }

  let previousRow = new Array(len2 + 1);
  let currentRow = new Array(len2 + 1);

  for (let j = 0; j <= len2; j++) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    currentRow[0] = i;
    const char1 = str1[i - 1];

    for (let j = 1; j <= len2; j++) {
      const cost = char1 === str2[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        currentRow[j - 1] + 1, // insertion
        previousRow[j] + 1, // deletion
        previousRow[j - 1] + cost, // substitution
      );
    }

    // Reuse arrays instead of reallocating.
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  const distance = previousRow[len2];
  const similarity = 1 - distance / Math.max(len1, len2);
  return Math.max(0, similarity);
}

/**
 * Calculate similarity between two texts using a two-stage approach:
 * 1) Cosine similarity on shingles filters out obviously different leaks.
 * 2) If the coarse score is high enough we confirm with Levenshtein distance.
 */
function calculateSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);

  if (normalized1 === normalized2) {
    return 1;
  }

  const shingleScore = cosineSimilarity(
    buildShingleVector(normalized1),
    buildShingleVector(normalized2),
  );

  if (shingleScore < SHINGLE_THRESHOLD) {
    return shingleScore;
  }

  return Math.max(
    shingleScore,
    levenshteinSimilarity(normalized1, normalized2),
  );
}

/**
 * Insert a new leak into the database.
 * Validates that:
 * - User is authenticated
 * - Required fields are provided
 * - User hasn't already submitted a leak for this request
 *
 * Handles automatic verification with consensus logic:
 * - When 2+ different users submit leaks for the same request
 * - Groups similar leak texts (85%+ similarity threshold)
 * - Finds the largest group of matching submissions
 * - Verifies the first leak from that consensus group
 * - Ensures the correct prompt is verified even if wrong ones are submitted first
 * - The request is automatically closed upon verification
 *
 * Returns a result object with success status and error message if validation fails.
 * This prevents "Uncaught" errors in the terminal logs.
 */
export const insertLeak = mutation({
  args: {
    targetName: v.string(),
    provider: v.string(),
    leakText: v.string(),
    targetType: v.union(
      v.literal("model"),
      v.literal("app"),
      v.literal("tool"),
      v.literal("agent"),
      v.literal("plugin"),
      v.literal("custom"),
    ),
    requestId: v.optional(v.id("requests")),
    requiresLogin: v.optional(v.boolean()),
    isPaid: v.optional(v.boolean()),
    hasToolPrompts: v.optional(v.boolean()),
    accessNotes: v.optional(v.string()),
    leakContext: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      leakId: v.id("leaks"),
      verified: v.boolean(),
      message: v.optional(v.string()),
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
        error: "You must be logged in to submit a leak",
      };
    }

    if (args.url && !/^https?:\/\/.+/i.test(args.url)) {
      return {
        success: false as const,
        error: "Invalid URL.",
      };
    }

    // Validate required fields
    if (!args.targetName || !args.provider || !args.leakText) {
      return {
        success: false as const,
        error: "Target name, provider, and leak text are required",
      };
    }

    // If this is for a request, check if user already submitted a leak for it
    if (args.requestId) {
      const request = await ctx.db.get(args.requestId);
      if (!request) {
        return {
          success: false as const,
          error: "Request not found",
        };
      }

      // Check if user already submitted a leak for this request
      const existingLeaks: Array<Id<"leaks">> = request.leaks || [];
      for (const existingLeakId of existingLeaks) {
        const existingLeak = await ctx.db.get(existingLeakId);
        if (existingLeak && existingLeak.submittedBy === userId) {
          return {
            success: false as const,
            error:
              "You have already submitted a leak for this request. Each user can only submit once per request.",
          };
        }
      }
    }

    // Insert the leak (always starts as unverified)
    const leakId = await ctx.db.insert("leaks", {
      targetName: args.targetName,
      provider: args.provider,
      leakText: args.leakText,
      targetType: args.targetType,
      isFullyVerified: false, // Always start as unverified
      requestId: args.requestId,
      requiresLogin: args.requiresLogin,
      isPaid: args.isPaid,
      hasToolPrompts: args.hasToolPrompts,
      accessNotes: args.accessNotes,
      leakContext: args.leakContext,
      url: args.url,
      submittedBy: userId,
    });

    // Update user's leaks array
    const user = await ctx.db.get(userId);
    if (user) {
      const currentLeaks = user.leaks || [];
      await ctx.db.patch(userId, {
        leaks: [...currentLeaks, leakId],
      });
    }

    let verified = false;
    let message: string | undefined = undefined;

    // If linked to a request, add to request's leaks array
    if (args.requestId) {
      const request = await ctx.db.get(args.requestId);
      if (request) {
        const updatedLeaks = [...(request.leaks ?? []), leakId];

        // Update request with new leak
        await ctx.db.patch(args.requestId, {
          leaks: updatedLeaks,
        });

        await ctx.scheduler.runAfter(
          0,
          internal.leaks.processRequestConsensus,
          {
            requestId: args.requestId,
          },
        );

        message = `Leak submitted successfully! This request now has ${updatedLeaks.length} submissions. We'll verify once consensus is reached.`;
      }
    }

    return {
      success: true as const,
      leakId,
      verified,
      message,
    };
  },
});

/**
 * Internal query to fetch the data needed for consensus evaluation.
 * Kept lightweight so the heavy similarity math runs inside an action.
 */
export const getRequestConsensusData = internalQuery({
  args: {
    requestId: v.id("requests"),
  },
  returns: v.union(
    v.null(),
    v.object({
      closed: v.optional(v.boolean()),
      submittedBy: v.optional(v.id("users")),
      leaks: v.array(
        v.object({
          leakId: v.id("leaks"),
          leakText: v.string(),
          submittedBy: v.optional(v.id("users")),
          isFullyVerified: v.boolean(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const leakDetails: Array<{
      leakId: Id<"leaks">;
      leakText: string;
      submittedBy?: Id<"users">;
      isFullyVerified: boolean;
    }> = [];

    const leakIds: Array<Id<"leaks">> = request.leaks || [];
    for (const leakId of leakIds) {
      const leak = await ctx.db.get(leakId);
      if (leak) {
        leakDetails.push({
          leakId,
          leakText: leak.leakText,
          submittedBy: leak.submittedBy,
          isFullyVerified: leak.isFullyVerified,
        });
      }
    }

    return {
      closed: request.closed ?? false,
      submittedBy: request.submittedBy,
      leaks: leakDetails,
    };
  },
});

/**
 * Action that runs the consensus logic outside the 1s / 64MB mutation limits.
 * It pulls the necessary data via internal queries and applies results through
 * mutations to keep database access transactional.
 */
export const processRequestConsensus = internalAction({
  args: {
    requestId: v.id("requests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.leaks.getRequestConsensusData, {
      requestId: args.requestId,
    });

    if (!data || data.closed) {
      return null;
    }

    const leakDetails = data.leaks.filter(
      (
        detail,
      ): detail is {
        leakId: Id<"leaks">;
        leakText: string;
        submittedBy: Id<"users">;
        isFullyVerified: boolean;
      } => !!detail.submittedBy && !detail.isFullyVerified,
    );

    if (leakDetails.length < 2) {
      return null;
    }

    const submitters = new Set<Id<"users">>();
    for (const detail of leakDetails) {
      submitters.add(detail.submittedBy);
    }

    if (submitters.size < 2) {
      return null;
    }

    const SIMILARITY_THRESHOLD = 0.85;
    const similarityGroups: Array<{
      leakIds: Array<Id<"leaks">>;
      userIds: Array<Id<"users">>;
      representativeText: string;
    }> = [];

    for (const detail of leakDetails) {
      let addedToGroup = false;

      for (const group of similarityGroups) {
        const similarity = calculateSimilarity(
          group.representativeText,
          detail.leakText,
        );

        if (similarity >= SIMILARITY_THRESHOLD) {
          if (!group.userIds.includes(detail.submittedBy)) {
            group.leakIds.push(detail.leakId);
            group.userIds.push(detail.submittedBy);
          }
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        similarityGroups.push({
          leakIds: [detail.leakId],
          userIds: [detail.submittedBy],
          representativeText: detail.leakText,
        });
      }
    }

    let largestGroup: (typeof similarityGroups)[0] | null = null;
    for (const group of similarityGroups) {
      if (
        group.userIds.length >= 2 &&
        (!largestGroup || group.userIds.length > largestGroup.userIds.length)
      ) {
        largestGroup = group;
      }
    }

    if (!largestGroup) {
      return null;
    }

    const leakToVerifyId = largestGroup.leakIds[0];
    const leakToVerify = leakDetails.find(
      (detail) => detail.leakId === leakToVerifyId,
    );

    if (!leakToVerify) {
      return null;
    }

    const verifierIds: Array<Id<"users">> = [];
    for (const userId of largestGroup.userIds) {
      if (userId !== leakToVerify.submittedBy) {
        verifierIds.push(userId);
      }
    }

    if (verifierIds.length === 0) {
      return null;
    }

    await ctx.runMutation(internal.leaks.applyConsensusResult, {
      requestId: args.requestId,
      leakId: leakToVerify.leakId,
      verifierIds,
    });

    return null;
  },
});

/**
 * Mutation invoked by the consensus action to persist verification results
 * transactionally and award points.
 */
export const applyConsensusResult = internalMutation({
  args: {
    requestId: v.id("requests"),
    leakId: v.id("leaks"),
    verifierIds: v.array(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.closed) {
      return null;
    }

    const leak = await ctx.db.get(args.leakId);
    if (!leak || leak.isFullyVerified || !leak.submittedBy) {
      return null;
    }

    await ctx.db.patch(args.leakId, {
      isFullyVerified: true,
      verifiedBy: args.verifierIds,
    });

    await ctx.db.patch(args.requestId, {
      closed: true,
    });

    const submitter = await ctx.db.get(leak.submittedBy);
    if (submitter) {
      await ctx.db.patch(leak.submittedBy, {
        points: (submitter.points ?? 0) + 100,
      });
    }

    for (const verifierId of args.verifierIds) {
      const verifier = await ctx.db.get(verifierId);
      if (verifier) {
        await ctx.db.patch(verifierId, {
          points: (verifier.points ?? 0) + 50,
        });
      }
    }

    if (request.submittedBy) {
      const requestCreator = await ctx.db.get(request.submittedBy);
      if (requestCreator) {
        await ctx.db.patch(request.submittedBy, {
          points: (requestCreator.points ?? 0) + 20,
        });
      }
    }

    return null;
  },
});

/**
 * Internal mutation to insert a fully verified leak directly.
 * This bypasses the verification workflow and is used for importing
 * leaks from trusted sources like GitHub repositories.
 *
 * Only accessible internally - cannot be called from client code.
 */
export const insertVerifiedLeak = internalMutation({
  args: {
    targetName: v.string(),
    provider: v.string(),
    leakText: v.string(),
    targetType: v.union(
      v.literal("model"),
      v.literal("app"),
      v.literal("tool"),
      v.literal("agent"),
      v.literal("plugin"),
      v.literal("custom"),
    ),
    requiresLogin: v.optional(v.boolean()),
    isPaid: v.optional(v.boolean()),
    hasToolPrompts: v.optional(v.boolean()),
    accessNotes: v.optional(v.string()),
    leakContext: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  returns: v.id("leaks"),
  handler: async (ctx, args) => {
    // Insert the leak as fully verified
    const leakId = await ctx.db.insert("leaks", {
      targetName: args.targetName,
      provider: args.provider,
      leakText: args.leakText,
      targetType: args.targetType,
      isFullyVerified: true, // Directly verified
      requiresLogin: args.requiresLogin,
      isPaid: args.isPaid,
      hasToolPrompts: args.hasToolPrompts,
      accessNotes: args.accessNotes,
      leakContext: args.leakContext,
      url: args.url,
      // No submittedBy since it's an automated import
      // No requestId since it's not linked to a request
    });

    return leakId;
  },
});

/**
 * Get all verified leaks from the database.
 * Returns an array of leak documents that have been fully verified.
 * Includes the names of users who verified each leak.
 *
 * OPTIMIZATION: Uses batch fetching to avoid N+1 query problem.
 * Instead of fetching each user individually, we collect all unique user IDs
 * and fetch them in one pass, then map the results.
 */
export const getVerifiedLeaks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("leaks"),
      _creationTime: v.number(),
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
      submitterName: v.optional(v.string()),
      verifierNames: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx) => {
    // Use index for efficient lookup of verified leaks (avoids full table scan)
    const leaks = await ctx.db
      .query("leaks")
      .withIndex("by_isFullyVerified", (q) => q.eq("isFullyVerified", true))
      .collect();

    // Collect all unique user IDs (submitters + verifiers) to batch fetch
    const userIds = new Set<Id<"users">>();
    for (const leak of leaks) {
      if (leak.submittedBy) {
        userIds.add(leak.submittedBy);
      }
      if (leak.verifiedBy) {
        for (const verifierId of leak.verifiedBy) {
          userIds.add(verifierId);
        }
      }
    }

    // Batch fetch all users at once (single pass instead of N+1)
    const userMap = new Map<Id<"users">, string>();
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        const user = await ctx.db.get(userId);
        userMap.set(userId, user?.name || "Unknown");
      }),
    );

    // Map leaks to include user names from the cached map
    const leaksWithNames = leaks.map((leak) => {
      const submitterName = leak.submittedBy
        ? userMap.get(leak.submittedBy)
        : undefined;
      const verifierNames = leak.verifiedBy
        ? leak.verifiedBy
            .map((id) => userMap.get(id))
            .filter((name): name is string => name !== undefined)
        : undefined;

      return {
        ...leak,
        submitterName,
        verifierNames,
      };
    });

    return leaksWithNames;
  },
});

/**
 * Get all unverified leaks from the database.
 * Returns an array of leak documents that are awaiting verification.
 */
export const getUnverifiedLeaks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("leaks"),
      _creationTime: v.number(),
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
    }),
  ),
  handler: async (ctx) => {
    // Use index for efficient lookup of unverified leaks (avoids full table scan)
    const leaks = await ctx.db
      .query("leaks")
      .withIndex("by_isFullyVerified", (q) => q.eq("isFullyVerified", false))
      .collect();
    return leaks;
  },
});

/**
 * Get all unique providers with their leak counts and sample leaks.
 * Returns an array of provider info objects grouped by provider name.
 * Includes: provider name, total leak count, target types, and sample target names.
 */
export const getProviders = query({
  args: {},
  returns: v.array(
    v.object({
      provider: v.string(),
      leakCount: v.number(),
      targetTypes: v.array(v.string()),
      sampleTargets: v.array(v.string()),
      latestLeakTime: v.number(),
    }),
  ),
  handler: async (ctx) => {
    // Use index for efficient lookup of verified leaks (avoids full table scan)
    const leaks = await ctx.db
      .query("leaks")
      .withIndex("by_isFullyVerified", (q) => q.eq("isFullyVerified", true))
      .collect();

    // Group leaks by provider
    const providerMap = new Map<
      string,
      {
        leaks: typeof leaks;
        targetTypes: Set<string>;
        targetNames: Set<string>;
        latestTime: number;
      }
    >();

    for (const leak of leaks) {
      const existing = providerMap.get(leak.provider);
      if (existing) {
        existing.leaks.push(leak);
        existing.targetTypes.add(leak.targetType);
        existing.targetNames.add(leak.targetName);
        existing.latestTime = Math.max(existing.latestTime, leak._creationTime);
      } else {
        providerMap.set(leak.provider, {
          leaks: [leak],
          targetTypes: new Set([leak.targetType]),
          targetNames: new Set([leak.targetName]),
          latestTime: leak._creationTime,
        });
      }
    }

    // Convert to array of provider info
    const providers: Array<{
      provider: string;
      leakCount: number;
      targetTypes: string[];
      sampleTargets: string[];
      latestLeakTime: number;
    }> = [];

    for (const [provider, data] of providerMap.entries()) {
      providers.push({
        provider,
        leakCount: data.leaks.length,
        targetTypes: Array.from(data.targetTypes),
        sampleTargets: Array.from(data.targetNames).slice(0, 5), // Get up to 5 sample target names
        latestLeakTime: data.latestTime,
      });
    }

    // Sort by leak count (descending)
    providers.sort((a, b) => b.leakCount - a.leakCount);

    return providers;
  },
});

/**
 * Get all verified leaks for a specific provider.
 * Returns an array of leak documents with submitter and verifier names.
 *
 * OPTIMIZATION: Uses batch fetching to avoid N+1 query problem.
 */
export const getLeaksByProvider = query({
  args: {
    provider: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("leaks"),
      _creationTime: v.number(),
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
      submitterName: v.optional(v.string()),
      verifierNames: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    // Use compound index for efficient lookup by provider + verification status
    // This is much faster than filter() as it uses the index directly
    const leaks = await ctx.db
      .query("leaks")
      .withIndex("by_provider_and_verified", (q) =>
        q.eq("provider", args.provider).eq("isFullyVerified", true),
      )
      .order("desc") // Order by creation time directly in query
      .collect();

    // Collect all unique user IDs to batch fetch
    const userIds = new Set<Id<"users">>();
    for (const leak of leaks) {
      if (leak.submittedBy) {
        userIds.add(leak.submittedBy);
      }
      if (leak.verifiedBy) {
        for (const verifierId of leak.verifiedBy) {
          userIds.add(verifierId);
        }
      }
    }

    // Batch fetch all users at once
    const userMap = new Map<Id<"users">, string>();
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        const user = await ctx.db.get(userId);
        userMap.set(userId, user?.name || "Unknown");
      }),
    );

    // Map leaks with user names from the cached map
    const leaksWithNames = leaks.map((leak) => {
      const submitterName = leak.submittedBy
        ? userMap.get(leak.submittedBy)
        : undefined;
      const verifierNames = leak.verifiedBy
        ? leak.verifiedBy
            .map((id) => userMap.get(id))
            .filter((name): name is string => name !== undefined)
        : undefined;

      return {
        ...leak,
        submitterName,
        verifierNames,
      };
    });

    return leaksWithNames;
  },
});
