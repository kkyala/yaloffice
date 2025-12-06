# Database Schema Update Instructions

The application requires some updates to your Supabase database schema to support the new Job Creation and Interview features.

## Steps to Fix "Missing Column" Errors

1.  **Open Supabase Dashboard**: Go to your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2.  **Go to SQL Editor**: Click on the SQL Editor icon in the left sidebar.
3.  **New Query**: Click "New query".
4.  **Copy & Paste**: Copy the entire content of the file `backend/update_schema.sql` (located in your project folder) and paste it into the SQL Editor.
5.  **Run**: Click the "Run" button.

## What this does
- Adds missing columns to the `jobs` table (e.g., `job_code`, `client`, `business_unit`).
- Adds missing columns to the `interviews` table to match the backend logic.

## Verify the Fix
After running the SQL script, you can verify the changes by running the following command in your terminal:

```bash
npx tsx backend/scripts/verify_schema_v2.ts
```

If successful, you will see:
`🎉 ALL CHECKS PASSED! The database schema is correct.`
