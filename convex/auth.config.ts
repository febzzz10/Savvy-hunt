import type { AuthConfig } from "convex/server";

const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: issuerDomain
    ? [
        {
          domain: issuerDomain,
          applicationID: "convex",
        },
      ]
    : [],
} satisfies AuthConfig;
