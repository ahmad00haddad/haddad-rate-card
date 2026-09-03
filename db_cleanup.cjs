/**
 * db_cleanup.cjs
 * 
 * Comprehensive fix for the pricing_items database:
 * 
 * PROBLEMS FOUND:
 * 1. Items named "عمّان" assigned to region "irbid" (wrong region)
 * 2. Items named "إربد" assigned to region "amman" (wrong region)
 * 3. Duplicate items with same name in same section/region
 * 4. Items in reels section that belong to films section (bug from sync)
 * 
 * STRATEGY:
 * - For each section, build the correct state:
 *   - Keep the canonical irbid items (region=irbid, named with إربد or no region suffix)
 *   - Keep the canonical amman items (region=amman, named with عمّان or no region suffix)
 *   - Delete all mismatched ones (amman name in irbid, irbid name in amman)
 *   - Delete true duplicates keeping the oldest
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

async function softDelete(id, name) {
  console.log('  DELETE:', name);
  const { error } = await sb.rpc('admin_update_pricing_item', {
    _item_id: id,
    _patch: { deleted_at: new Date().toISOString() }
  });
  if (error) console.log('  ERROR deleting', name, ':', error.message);
}

async function run() {
  const { data: items, error } = await sb
    .from('pricing_items')
    .select('*')
    .is('deleted_at', null)
    .order('created_at');

  if (error) throw error;
  console.log('Total active items:', items.length);

  // Step 1: Find items where name says one region but is assigned to another
  const wrongRegion = items.filter(i => {
    const nameHasAmman = i.name_ar.includes('عمّان') || i.name_ar.includes('عمان');
    const nameHasIrbid = i.name_ar.includes('إربد') || i.name_ar.includes('اربد');
    return (nameHasAmman && i.region === 'irbid') || (nameHasIrbid && i.region === 'amman');
  });

  console.log('\n--- Step 1: Wrong region assignments (' + wrongRegion.length + ' items) ---');
  for (const item of wrongRegion) {
    await softDelete(item.id, item.name_ar + ' [region=' + item.region + ']');
  }

  // Step 2: Find duplicate items (same name_ar + section + region)
  const remaining = items.filter(i => !wrongRegion.find(w => w.id === i.id));
  
  const seen = new Map();
  const duplicates = [];
  
  for (const item of remaining) {
    const key = item.name_ar.trim() + '|' + item.section + '|' + item.region;
    if (seen.has(key)) {
      // Keep the first (oldest), delete duplicates
      duplicates.push(item);
    } else {
      seen.set(key, item);
    }
  }

  console.log('\n--- Step 2: Duplicate items (' + duplicates.length + ' items) ---');
  for (const item of duplicates) {
    await softDelete(item.id, item.name_ar + ' [section=' + item.section + ', region=' + item.region + '] DUPLICATE');
  }

  // Step 3: Verify final state
  const { data: final } = await sb
    .from('pricing_items')
    .select('id,name_ar,region,section')
    .is('deleted_at', null)
    .order('section')
    .order('region');

  console.log('\n--- Final state (' + final.length + ' items) ---');
  final.forEach(i => {
    const flag = (i.name_ar.includes('عمّان') || i.name_ar.includes('عمان')) && i.region === 'irbid' ? ' *** STILL WRONG' :
                 (i.name_ar.includes('إربد') || i.name_ar.includes('اربد')) && i.region === 'amman' ? ' *** STILL WRONG' : '';
    console.log(i.region.padEnd(8), i.section.padEnd(12), i.name_ar + flag);
  });
  
  console.log('\nDone!');
}

run().catch(console.error);
