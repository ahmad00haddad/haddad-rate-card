
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.split('VITE_SUPABASE_URL="')[1].split('"')[0];
const key = env.split('VITE_SUPABASE_PUBLISHABLE_KEY="')[1].split('"')[0];
const sb = createClient(url, key);
// Try to sign in to get current user ID
// Change email/password to your real credentials
const { data, error } = await sb.auth.signInWithPassword({ email: process.argv[2], password: process.argv[3] });
if (error) { console.log('Login error:', error.message); process.exit(1); }
const uid = data.user.id;
console.log('Your user ID:', uid);
// Now insert as admin
const { error: roleErr } = await sb.from('user_roles').insert({ user_id: uid, role: 'admin' });
if (roleErr) console.log('Role insert error:', roleErr.message, roleErr.code);
else console.log('SUCCESS! You are now admin.');

