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
  
  const badItems = items.filter(i => new Date(i.created_at) > new Date('2026-09-03T00:00:00Z'));
  
  console.log('Deleting ' + badItems.length + ' items...');
  let i = 0;
  for (const item of badItems) {
    console.log('Deleting', item.name_ar, item.region);
    await supabase.rpc('admin_update_pricing_item', {
      _item_id: item.id,
      _patch: { deleted_at: new Date().toISOString() }
    });
    i++;
  }
  console.log('Deleted ' + i + ' items.');
}
run();
