import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: Email({
        id: "password-reset",
        name: "Password reset",
        from: process.env.AUTH_EMAIL_FROM ?? "World Cup LMS <no-reply@worldcuplms.app>",
        maxAge: 60 * 30,
        async sendVerificationRequest({ identifier, token }) {
          const apiKey = process.env.RESEND_API_KEY;
          const from = process.env.AUTH_EMAIL_FROM ?? "World Cup LMS <no-reply@worldcuplms.app>";

          if (!apiKey) {
            throw new Error("Password reset email is not configured. Set RESEND_API_KEY in Convex env.");
          }

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: identifier,
              subject: "Reset your World Cup LMS password",
              text: `Use this code to reset your World Cup LMS password: ${token}\n\nThis code expires in 30 minutes.`,
              html: `<p>Use this code to reset your World Cup LMS password:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.12em">${token}</p><p>This code expires in 30 minutes.</p>`,
            }),
          });

          if (!response.ok) {
            throw new Error(`Could not send password reset email (${response.status}).`);
          }
        },
      }),
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
