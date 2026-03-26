<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/675743fb-1f7e-4dd3-a0f7-3068667dbfdc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase Monitor Admin

This project serves as a comprehensive monitoring and management tool for your Supabase project. Key features:
- **Operational Status:** Monitor system-level metadata and last run times.
- **Database Explorer:** Track row counts across tables in real-time.
- **Inventory Tracking:** Visual indicators for stock levels in the trivia system.
- **Action Triggers:** Send control signals to backend workers.
- **Diagnostics:** View live error logs and system events.

Supabase security and maintenance notes live in [docs/supabase-security.md](/home/dustin/Projects/TheRemote/docs/supabase-security.md). This includes the cleanup for the legacy `public.games` table that should not remain exposed through PostgREST.
