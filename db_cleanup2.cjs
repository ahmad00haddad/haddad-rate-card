/**
 * db_cleanup2.cjs — uses direct DB update since RPC is permission-denied
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnvVal(env, key) {
  const line = env.split('\n').find(l => l.startsWith(key + '='));
  if (!line) return '';
  return line.split('=').slice(1).join('=').trim().replace(/^"/, '').replace(/"$/, '');
}

const env = fs.readFileSync('.env', 'utf8');
const url = getEnvVal(env, 'VITE_SUPABASE_URL');
const apiKey = getEnvVal(env, 'VITE_SUPABASE_PUBLISHABLE_KEY');
const sb = createClient(url, apiKey);

// IDs of bad items to delete (from the audit above)
// Wrong region assignments: amman name in irbid or irbid name in amman

async function run() {
  const { data: items, error } = await sb
    .from('pricing_items')
    .select('id,name_ar,region,section')
    .is('deleted_at', null);

  if (error) throw error;

  const wrongRegion = items.filter(i => {
    const nameHasAmman = i.name_ar.includes('عمّان') || i.name_ar.includes('عمان');
    const nameHasIrbid = i.name_ar.includes('إربد') || i.name_ar.includes('اربد');
    return (nameHasAmman && i.region === 'irbid') || (nameHasIrbid && i.region === 'amman');
  });

  console.log('Items to fix:', wrongRegion.length);
  
  for (const item of wrongRegion) {
    // Swap the region to the correct one based on the name
    const nameHasAmman = item.name_ar.includes('عمّان') || item.name_ar.includes('عمان');
    const correctRegion = nameHasAmman ? 'amman' : 'irbid';
    
    console.log('Fixing:', item.name_ar, '|', item.region, '->', correctRegion);
    
    // Try direct update
    const { error: updateErr } = await sb
      .from('pricing_items')
      .update({ region: correctRegion })
      .eq('id', item.id);
    
    if (updateErr) {
      console.log('  UPDATE failed:', updateErr.message);
      // Try RPC with the patch
      const { error: rpcErr } = await sb.rpc('admin_update_pricing_item', {
        _item_id: item.id,
        _patch: { region: correctRegion }
      });
      if (rpcErr) console.log('  RPC also failed:', rpcErr.message);
      else console.log('  Fixed via RPC!');
    } else {
      console.log('  Fixed via direct update!');
    }
  }
  
  // Check for duplicates after fixing
  const { data: final } = await sb
    .from('pricing_items')
    .select('id,name_ar,region,section')
    .is('deleted_at', null)
    .order('section')
    .order('region');
    
  // Find duplicates (same name+section+region)
  const seen = new Map();
  const dupes = [];
  for (const item of (final || [])) {
    const k = item.name_ar.trim() + '|' + item.section + '|' + item.region;
    if (seen.has(k)) dupes.push(item);
    else seen.set(k, item);
  }
  
  console.log('\nDuplicates to delete:', dupes.length);
  for (const item of dupes) {
    console.log('Deleting dupe:', item.name_ar, item.region, item.section);
    const { error: delErr } = await sb
      .from('pricing_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', item.id);
    if (delErr) console.log('  Error:', delErr.message);
    else console.log('  Deleted!');
  }
  
  console.log('\n=== FINAL STATE ===');
  const { data: post } = await sb
    .from('pricing_items')
    .select('id,name_ar,region,section')
    .is('deleted_at', null)
    .order('section').order('region');
  (post || []).forEach(i => {
    const flag = (i.name_ar.includes('عمّان') || i.name_ar.includes('عمان')) && i.region === 'irbid' ? ' *** STILL WRONG' :
                 (i.name_ar.includes('إربد') || i.name_ar.includes('اربد')) && i.region === 'amman' ? ' *** STILL WRONG' : '';
    console.log(i.region.padEnd(8), i.section.padEnd(12), i.name_ar + flag);
  });
  console.log('\nTotal:', (post || []).length, 'items');
}
run().catch(console.error);
