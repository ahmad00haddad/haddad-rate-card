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
  
  const irbidItems = items.filter(i => i.region === 'irbid');
  const ammanItems = items.filter(i => i.region === 'amman');
  
  let newItems = [];
  
  for (const item of irbidItems) {
    if (!ammanItems.find(a => a.name_ar === item.name_ar && a.section === item.section)) {
      const { id, created_at, updated_at, deleted_at, region, item_key, ...rest } = item;
      newItems.push({ ...rest, region: 'amman', item_key: item_key + '_a_' + Date.now() });
    }
  }
  
  for (const item of ammanItems) {
    if (!irbidItems.find(a => a.name_ar === item.name_ar && a.section === item.section)) {
      const { id, created_at, updated_at, deleted_at, region, item_key, ...rest } = item;
      newItems.push({ ...rest, region: 'irbid', item_key: item_key + '_i_' + Date.now() });
    }
  }
  
  if (newItems.length > 0) {
    for (const newItem of newItems) {
      const { error: rpcError } = await supabase.rpc('admin_create_pricing_item', { _item: newItem });
      if (rpcError) console.error(rpcError);
      else console.log('Synced:', newItem.name_ar, 'to', newItem.region);
    }
  } else {
    console.log('Everything in sync!');
  }
}
run();
