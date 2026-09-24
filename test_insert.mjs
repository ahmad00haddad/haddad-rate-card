
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL="(.+)"/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.+)"/)[1].trim();
const supabase = createClient(url, key);
async function run() {
  const payload = { name: 'Test Equip', description: '', category: '', original_price: 0, image_path: '', is_available: true };
  const { data, error } = await supabase.from('equipment').insert(payload);
  console.log('Error:', error);
}
run();

