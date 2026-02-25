/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly SITE_URL: string;
  readonly GITHUB_WEBHOOK_SECRET: string;
  readonly DEPLOY_TOKEN: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly ADMIN_EMAILS: string;
  readonly TURNSTILE_SITEKEY?: string;
  readonly TURNSTILE_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
