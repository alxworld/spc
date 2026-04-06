import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

// Clerk webhook — syncs user.created / user.updated / user.deleted into the users table
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("CLERK_WEBHOOK_SECRET not set", { status: 500 });
    }

    const svix = new Webhook(webhookSecret);
    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") ?? "",
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    };

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = svix.verify(payload, headers) as typeof event;
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const data = event.data as {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string;
      last_name?: string;
    };

    if (event.type === "user.created" || event.type === "user.updated") {
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address,
        name,
      });
    }

    if (event.type === "user.deleted") {
      await ctx.runMutation(internal.users.deleteByClerkId, { clerkId: data.id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
