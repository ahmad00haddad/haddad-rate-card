const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
let url, key;
if (envText.includes('"')) {
  url = envText.split('VITE_SUPABASE_URL="')[1].split('"')[0];
  key = envText.split('VITE_SUPABASE_PUBLISHABLE_KEY="')[1].split('"')[0];
} else {
  url = envText.split('VITE_SUPABASE_URL=')[1].split('\n')[0].trim();
  key = envText.split('VITE_SUPABASE_PUBLISHABLE_KEY=')[1].split('\n')[0].trim();
}

const supabase = createClient(url, key);

async function run() {
  const { data: items, error } = await supabase.from('pricing_items').select('*').is('deleted_at', null);
  if (error) throw error;
  console.log(JSON.stringify(items.map(i => ({ id: i.id, name: i.name_ar, region: i.region, section: i.section, created: i.created_at })), null, 2));
}
run();
