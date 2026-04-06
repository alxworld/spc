import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId as Id<"users">;
      }
      return await ctx.db.insert("users", {
        email: args.profile.email,
        name: (args.profile.name as string | undefined) ?? args.profile.email ?? "User",
        role: "user" as const,
      });
    },
  },
});
