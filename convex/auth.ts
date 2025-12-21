import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }

      return await ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        image: args.profile.image,
        points: 0,
        requests: [],
        leaks: [],
      });
    },
  },
});
