import { internalAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
const DEFAULT_REPO_OWNER = "elder-plinius";
const DEFAULT_REPO_NAME = "CL4R1T4S";
const DEFAULT_BRANCH = "main";
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
const GITHUB_HEADERS = {
  "User-Agent": "LeakHubConvex/1.0",
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${GITHUB_API_TOKEN}`,
};

export const importAllLeaks = internalAction({
  args: {},
  handler: async (ctx) => {
    const repoOwner = DEFAULT_REPO_OWNER;
    const repoName = DEFAULT_REPO_NAME;
    const branch = DEFAULT_BRANCH;
    const headers = GITHUB_HEADERS;
    const repo = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/?ref=${branch}`,
      {
        headers,
      },
    );
    const directories = await repo.json();

    let insertedLeaks = 0;
    for (const directory of directories) {
      if (directory.type !== "dir") {
        continue;
      }
      const files = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${directory.path}?ref=${branch}`,
        {
          headers,
        },
      );
      const filesJson = await files.json();
      for (const file of filesJson) {
        const content = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path}?ref=${branch}`,
          {
            headers,
          },
        );
        const contentJson = await content.json();
        console.log(contentJson);
        const targetName = contentJson.name;
        const provider = contentJson.path.split("/")[0];

        try {
          const contentText = decodeBase64Utf8(contentJson.content);

          // Use internal mutation to insert fully verified leaks from GitHub
          await ctx.runMutation(internal.leaks.insertVerifiedLeak, {
            targetName,
            provider,
            leakText: contentText,
            targetType: "model" as const,
          });
          insertedLeaks++;
        } catch (error) {
          console.error(`Error decoding content for ${file.path}: ${error}`);
        }
      }
    }

    return insertedLeaks;
  },
});

/**
 * Public action to trigger GitHub import of leaks.
 * Returns success status, count of imported leaks, and a message.
 */
export const triggerGitHubImport = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    count: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    try {
      // Call the internal action
      const count: number = await ctx.runAction(internal.github.importAllLeaks);

      return {
        success: true,
        count,
        message: `Successfully imported ${count} leaks`,
      };
    } catch (error) {
      console.error("Error importing leaks:", error);
      return {
        success: false,
        count: 0,
        message: `Error: ${error}`,
      };
    }
  },
});

function decodeBase64Utf8(base64: string): string {
  // Remove whitespace and line breaks
  base64 = base64.replace(/\r?\n|\r/g, "").trim();
  // Normalize URL-safe and padding
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";

  // Decode Base64 to binary string
  const binary = atob(base64);

  // Convert binary string to UTF-8 text
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const decoded = new TextDecoder("utf-8").decode(bytes);
  return decoded;
}
