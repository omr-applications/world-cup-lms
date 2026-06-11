import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("You must be signed in.");
  }

  return userId;
}

export async function ensureProfile(ctx: MutationCtx, userId: Awaited<ReturnType<typeof requireUserId>>) {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  const user = await ctx.db.get(userId);
  const email = typeof user?.email === "string" ? user.email : "Player";
  const userName = typeof user?.name === "string" && user.name.trim() ? user.name.trim() : "";
  const [firstName, ...restName] = userName.split(/\s+/).filter(Boolean);
  const lastName = restName.join(" ");
  const displayName = userName || email.split("@")[0];

  if (existing) {
    if ((!existing.firstName || !existing.lastName) && userName) {
      await ctx.db.patch(existing._id, {
        firstName: existing.firstName ?? firstName,
        lastName: existing.lastName ?? lastName,
        displayName,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    }
    return existing;
  }

  const now = Date.now();

  const profileId = await ctx.db.insert("profiles", {
    userId,
    firstName,
    lastName,
    displayName,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(profileId);
}

export function normalizeJoinCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
