import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        const firstName = String(params.firstName ?? "").trim();
        const lastName = String(params.lastName ?? "").trim();
        const name = [firstName, lastName].filter(Boolean).join(" ");

        if (!email) {
          throw new Error("Email is required.");
        }
        if (params.flow === "signUp" && (!firstName || !lastName)) {
          throw new Error("First and last name are required.");
        }

        return {
          email,
          ...(name ? { name } : {}),
        };
      },
    }),
  ],
});
