
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.split('VITE_SUPABASE_URL="')[1].split('"')[0];
const key = env.split('VITE_SUPABASE_PUBLISHABLE_KEY="')[1].split('"')[0];
const sb = createClient(url, key);
const { data, error } = await sb.from('user_roles').select('*');
console.log('data:', data);
console.log('error:', error);

