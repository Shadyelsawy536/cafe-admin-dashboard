import { createClient } from '@supabase/supabase-js';

// Same project as the Flutter customer app. The anon key is safe to ship —
// it grants nothing by itself; is_restaurant_staff() in RLS is what
// actually gates staff-only data, not this key.
const SUPABASE_URL = 'https://rsajmvnbezztzdkbglbp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWptdm5iZXp6dHpka2JnbGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDA1MzcsImV4cCI6MjEwMjAxNjUzN30.pqOBqWwmbedn1CR-y0ZAFDHa3GZIWUKwqFmnyx0f4Os';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
