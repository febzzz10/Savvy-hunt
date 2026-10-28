"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function MissingConfiguration() {
  return (
    <main className="shell flex min-h-screen items-center justify-center py-16">
      <div className="card max-w-xl p-8 md:p-12">
        <p className="eyebrow text-flame">Configuration required</p>
        <h1 className="display mt-4 text-4xl md:text-5xl">Connect Convex to begin.</h1>
        <p className="mt-5 text-sm leading-7 text-muted">
          Add <code className="bg-paper-deep px-1.5 py-0.5">NEXT_PUBLIC_CONVEX_URL</code> to{" "}
          <code className="bg-paper-deep px-1.5 py-0.5">.env.local</code>, then deploy the Convex
          functions. The public site stays read-only until a deployment is connected.
        </p>
        <p className="mt-3 text-sm leading-7 text-muted">
          Admin access additionally needs Clerk keys and a Convex JWT template. See the README for
          the exact setup sequence.
        </p>
      </div>
    </main>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [],
  );

  if (!client) return <MissingConfiguration />;

  if (clerkEnabled) {
    return (
      <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
        <ConvexProviderWithClerk client={client} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
