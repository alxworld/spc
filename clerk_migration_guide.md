# Migrating Authentication from @convex-dev/auth to Clerk

## Overview

This guide replaces the current `@convex-dev/auth` Password provider with Clerk.

**What changes:**
- Clerk handles all auth UI, sessions, and JWT issuance
- Convex validates Clerk JWTs instead of issuing its own
- Custom login/register pages are replaced with Clerk's hosted or embedded components
- User records in the Convex `users` table are synced via a Clerk webhook
- RSA keys (`JWT_PRIVATE_KEY`, `JWKS`) are removed from Convex — no longer needed

**Files that change:**

| File | What changes |
|---|---|
| `frontend/convex/auth.config.ts` | Point to Clerk JWT issuer instead of `SITE_URL` |
| `frontend/convex/auth.ts` | Delete — Clerk replaces `@convex-dev/auth` entirely |
| `frontend/convex/http.ts` | Add Clerk webhook handler for user sync |
| `frontend/convex/schema.ts` | Remove `authTables` spread; keep plain `users` table |
| `frontend/convex/users.ts` | Remove `userIdFromIdentity` split; Clerk subject is plain user ID |
| `frontend/convex/bookings.ts` | Same — remove `split("|")[0]` |
| `frontend/convex/admin.ts` | Same |
| `frontend/convex/chat.ts` | Same |
| `frontend/src/components/ConvexClientProvider.tsx` | Wrap with `ClerkProvider` + `ConvexProviderWithClerk` |
| `frontend/src/components/Navbar.tsx` | Use `useClerk().signOut()` instead of `useAuthActions()` |
| `frontend/src/app/login/page.tsx` | Replace custom form with Clerk `<SignIn>` component |
| `frontend/src/app/register/page.tsx` | Replace custom form with Clerk `<SignUp>` component |
| `frontend/src/app/dashboard/page.tsx` | Use `useAuth()` from Clerk instead of `useConvexAuth()` |
| `frontend/src/app/dashboard/book/page.tsx` | Same |
| `frontend/src/app/admin/page.tsx` | Same |
| `frontend/src/components/ChatWidget.tsx` | Same |

---

## Step 1 — Create a Clerk Application

1. Go to [clerk.com](https://clerk.com) and create a free account
2. Click **Create application**
3. Enter a name (e.g. `SPC Prayer Hall`)
4. Enable **Email address** + **Password** as sign-in methods (disable phone/OAuth unless wanted)
5. Click **Create application**

From the Clerk dashboard you will need:
- **Publishable key** — starts with `pk_test_...` (or `pk_live_...` in production)
- **Secret key** — starts with `sk_test_...`
- **JWT issuer URL** — found under **Configure → JWT Templates → Convex** (see Step 3)

---

## Step 2 — Create a Clerk JWT Template for Convex

Convex needs Clerk to issue JWTs with a specific audience claim.

1. Clerk dashboard → **Configure → JWT Templates**
2. Click **New template** → choose **Convex**
3. Leave all defaults — the template name is `convex`
4. Copy the **Issuer URL** shown (looks like `https://your-app.clerk.accounts.dev`)
5. Click **Save**

---

## Step 3 — Install packages

```bash
cd frontend

# Add Clerk packages
npm install @clerk/nextjs convex

# Remove @convex-dev/auth
npm uninstall @convex-dev/auth
```

Also install `svix` for webhook signature verification:

```bash
npm install svix
```

---

## Step 4 — Set environment variables

### Vercel (frontend)

Add these in Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` from Clerk dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://acoustic-civet-581.eu-west-1.convex.cloud` |

Also add to your local `frontend/.env.local` for development:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Convex dashboard (production + dev)

Add these in Convex dashboard → Settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-app.clerk.accounts.dev` | From Step 2 |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | From Step 8 below |
| `OPENROUTER_API_KEY` | unchanged | Keep as-is |

**Remove** these — no longer needed:
- `JWT_PRIVATE_KEY`
- `JWKS`
- `SITE_URL`

---

## Step 5 — Update `convex/auth.config.ts`

Replace the current `SITE_URL`-based config with Clerk's JWT issuer:

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};
```

---

## Step 6 — Delete `convex/auth.ts`

The entire file is no longer needed. Delete it:

```bash
rm frontend/convex/auth.ts
```

---

## Step 7 — Update `convex/schema.ts`

Remove `authTables` (Clerk manages its own user store outside Convex). Keep the plain `users` table.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // No ...authTables — Clerk manages auth state externally

  users: defineTable({
    clerkId: v.string(),          // Clerk user ID (e.g. "user_2abc...")
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("user"), v.literal("admin"), v.literal("superadmin"))
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("email", ["email"]),

  bookings: defineTable({
    userId: v.id("users"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    purpose: v.string(),
    attendees: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_date", ["userId", "date"])
    .index("by_date_and_status", ["date", "status"])
    .index("by_status", ["status"]),

  blockedDates: defineTable({
    date: v.string(),
    reason: v.string(),
  }).index("by_date", ["date"]),
});
```

---

## Step 8 — Add Clerk webhook to `convex/http.ts`

Clerk sends webhook events when users are created, updated, or deleted. This keeps the Convex `users` table in sync.

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;
    const svix = new Webhook(webhookSecret);

    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id")!,
      "svix-timestamp": request.headers.get("svix-timestamp")!,
      "svix-signature": request.headers.get("svix-signature")!,
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
      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address,
        name: [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined,
      });
    }

    if (event.type === "user.deleted") {
      await ctx.runMutation(internal.users.deleteByClerkId, { clerkId: data.id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
```

**Register the webhook in Clerk:**
1. Clerk dashboard → **Configure → Webhooks** → **Add Endpoint**
2. URL: `https://acoustic-civet-581.eu-west-1.convex.site/clerk-webhook`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** (`whsec_...`) → set as `CLERK_WEBHOOK_SECRET` in Convex

---

## Step 9 — Update `convex/users.ts`

Add internal mutations for the webhook. Update `getMe` to use the Clerk subject directly (no `split("|")[0]` needed — Clerk subjects are plain IDs like `user_2abc...`).

```typescript
// convex/users.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

/** Current authenticated user's record. */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    // Clerk subject is the plain Clerk user ID — no splitting needed
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/** All users — admin only. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me || (me.role !== "admin" && me.role !== "superadmin")) {
      throw new ConvexError("Admin access required");
    }
    return await ctx.db.query("users").take(200);
  },
});

/** Called by the Clerk webhook to sync users. */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email, name: args.name });
    } else {
      await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        role: "user",
      });
    }
  },
});

/** Called by the Clerk webhook when a user is deleted. */
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) await ctx.db.delete(user._id);
  },
});

/** Promote a user to superadmin by email. */
export const seedSuperAdmin = mutation({
  args: { email: v.string(), role: v.literal("superadmin") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: "superadmin" });
      return existing._id;
    }
    return null;
  },
});
```

---

## Step 10 — Update `convex/bookings.ts`, `admin.ts`, `chat.ts`

In all three files, replace the `getAuthUser` / `requireAdmin` helpers. Remove the `split("|")[0]` — Clerk's `identity.subject` is the direct user ID.

**Pattern to apply in each file:**

```typescript
// OLD — @convex-dev/auth
const userId = identity.subject.split("|")[0] as Id<"users">;
const user = await ctx.db.get(userId);

// NEW — Clerk
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();
if (!user) throw new ConvexError("User not found");
```

Apply this change to:
- `getAuthUser()` in `bookings.ts`
- `requireAdmin()` in `admin.ts`
- The identity block in `chat.ts` `sendMessage` action

---

## Step 11 — Update `ConvexClientProvider.tsx`

Replace `ConvexAuthProvider` with Clerk's provider wrapping `ConvexProviderWithClerk`:

```typescript
// frontend/src/components/ConvexClientProvider.tsx
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

---

## Step 12 — Update `login/page.tsx`

Replace the custom email/password form with Clerk's `<SignIn>` component:

```typescript
// frontend/src/app/login/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-spc-navy flex items-center justify-center px-4 py-12">
      <SignIn
        appearance={{
          elements: {
            card: "bg-white/8 border border-white/15 shadow-xl",
            headerTitle: "text-white",
            headerSubtitle: "text-white/50",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/10 border-white/20 text-white placeholder:text-white/30",
            footerActionLink: "text-spc-blue",
            formButtonPrimary: "bg-spc-purple hover:bg-spc-purple/90",
          },
        }}
      />
    </div>
  );
}
```

---

## Step 13 — Update `register/page.tsx`

```typescript
// frontend/src/app/register/page.tsx
import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-spc-navy flex items-center justify-center px-4 py-12">
      <SignUp
        appearance={{
          elements: {
            card: "bg-white/8 border border-white/15 shadow-xl",
            headerTitle: "text-white",
            headerSubtitle: "text-white/50",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/10 border-white/20 text-white placeholder:text-white/30",
            footerActionLink: "text-spc-blue",
            formButtonPrimary: "bg-spc-purple hover:bg-spc-purple/90",
          },
        }}
      />
    </div>
  );
}
```

---

## Step 14 — Update `Navbar.tsx`

Replace `useAuthActions` + `useConvexAuth` with Clerk hooks:

```typescript
// Replace these imports:
// import { useConvexAuth } from "convex/react";
// import { useAuthActions } from "@convex-dev/auth/react";

import { useAuth, useClerk } from "@clerk/nextjs";

// Inside the component:
const { isSignedIn } = useAuth();
const { signOut } = useClerk();

async function handleSignOut() {
  await signOut();
  window.location.href = "/";
}

// Replace isAuthenticated with isSignedIn throughout the component
```

---

## Step 15 — Update dashboard and protected pages

Replace `useConvexAuth()` with Clerk's `useAuth()` in all protected pages:

```typescript
// OLD
import { useConvexAuth } from "convex/react";
const { isAuthenticated, isLoading } = useConvexAuth();

// NEW
import { useAuth } from "@clerk/nextjs";
const { isSignedIn: isAuthenticated, isLoaded } = useAuth();
const isLoading = !isLoaded;
```

Apply to:
- `dashboard/page.tsx`
- `dashboard/book/page.tsx`
- `admin/page.tsx`
- `admin/users/page.tsx`
- `ChatWidget.tsx`

---

## Step 16 — Add middleware for route protection

Create `frontend/src/middleware.ts` to protect routes at the edge:

```typescript
// frontend/src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

This redirects unauthenticated users away from `/dashboard` and `/admin` automatically.

---

## Step 17 — Deploy Convex functions

```bash
cd frontend
npx convex deploy
```

---

## Step 18 — Deploy frontend to Vercel

Push to `main` — Vercel auto-deploys. Or trigger manually from the Vercel dashboard.

---

## Environment variable summary after migration

### Vercel

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
| `NEXT_PUBLIC_CONVEX_URL` | `https://acoustic-civet-581.eu-west-1.convex.cloud` |

### Convex dashboard

| Variable | Value |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | `https://your-app.clerk.accounts.dev` |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` |
| `OPENROUTER_API_KEY` | unchanged |

**Remove from Convex:** `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`

---

## What Clerk gives you out of the box

Once migrated, you get for free (no extra code):
- Hosted sign-in / sign-up UI with your branding
- Email verification on registration
- Password reset via email
- Social login (Google, GitHub, etc.) — enable in Clerk dashboard
- Multi-factor authentication — enable in Clerk dashboard
- User management dashboard at `clerk.com`
- Session management and automatic token refresh
