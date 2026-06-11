import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import type { NextRequest } from "next/server";

const authProxy = convexAuthNextjsMiddleware();

export async function POST(request: NextRequest) {
  return (await authProxy(request, {} as never)) ?? new Response(null, { status: 204 });
}
