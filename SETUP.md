# DayBlocks — Setup Guide

## Step 1: Fill in your .env.local

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MSAL_CLIENT_ID=your-azure-app-client-id
VITE_MSAL_TENANT_ID=your-tenant-id
```

## Step 2: Run the Supabase migration

1. Open Supabase Dashboard → your project → SQL Editor
2. Paste and run the contents of `supabase/migrations/001_dayblocks_schema.sql`
3. This creates the `tasks` and `time_entries` tables with RLS policies

## Step 3: Deploy the Claude Edge Function

```bash
# Install Supabase CLI if you haven't
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set your Anthropic key as a secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy the function
supabase functions deploy claude-proxy
```

## Step 4: Azure App Registration (Microsoft SSO + Calendar)

1. Go to portal.azure.com → Azure Active Directory → App Registrations → New
2. Name: "DayBlocks"
3. Supported account types: "Accounts in this organizational directory only" (single tenant)
4. Redirect URI: Web → `http://localhost:5174` (add your production URL later)
5. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
6. Go to API Permissions → Add: `User.Read`, `Calendars.ReadWrite` (Delegated)
7. Grant admin consent if needed

## Step 5: Run the app

```bash
npm run dev
```

Open on your phone by connecting to the same WiFi and using:
```
http://YOUR_LOCAL_IP:5174
```

Or: `npm run dev -- --host` to expose it on the network.

## Production deploy (optional)

```bash
npm run build
# Deploy `dist/` to Vercel, Netlify, or Cloudflare Pages
# Add your production URL to Azure App Registration redirect URIs
```
