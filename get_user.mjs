
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.split('VITE_SUPABASE_URL="')[1].split('"')[0];
const key = env.split('VITE_SUPABASE_PUBLISHABLE_KEY="')[1].split('"')[0];
const sb = createClient(url, key);
const { data, error } = await sb.auth.admin.listUsers();
if (error) console.log('err (expected - anon key):', error.message);
else console.log('users:', data.users.map(u => ({id: u.id, email: u.email})));

