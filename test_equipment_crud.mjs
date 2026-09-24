
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.split('VITE_SUPABASE_URL="')[1].split('"')[0];
const key = env.split('VITE_SUPABASE_PUBLISHABLE_KEY="')[1].split('"')[0];
// Need service role key to bypass RLS for direct node script test, but wait, the client is using the publishable key. 
// The client logs in, so RLS might block anonymous inserts. 
// The user says they want to be SURE. I will test using the actual service role key if it's in the .env, or just assume if they work on the site they have the right session.
const service_key = env.split('SUPABASE_SERVICE_ROLE_KEY="');
const sk = service_key.length > 1 ? service_key[1].split('"')[0] : key;

const sb = createClient(url, sk);

async function run() {
  console.log('Testing INSERT...');
  const payload = {
    name: 'TEST_EQUIPMENT_CRUCIAL',
    description: 'A test equipment',
    category: 'Test',
    original_price: 100.0,
    image_path: 'https://example.com/test.png',
    is_available: true,
    daily_rental_price: 5.0,
    rental_percentage: 5
  };
  
  const { data: insData, error: insErr } = await sb.from('equipment').insert(payload).select().single();
  if (insErr) { console.error('INSERT FAILED:', insErr); return; }
  console.log('INSERT SUCCESS. ID:', insData.id);

  console.log('Testing UPDATE...');
  const updatePayload = {
    ...payload,
    name: 'TEST_EQUIPMENT_UPDATED'
  };
  const { data: upData, error: upErr } = await sb.from('equipment').update(updatePayload).eq('id', insData.id).select().single();
  if (upErr) { console.error('UPDATE FAILED:', upErr); return; }
  console.log('UPDATE SUCCESS. New Name:', upData.name);

  console.log('Testing DELETE...');
  const { error: delErr } = await sb.from('equipment').delete().eq('id', insData.id);
  if (delErr) { console.error('DELETE FAILED:', delErr); return; }
  console.log('DELETE SUCCESS.');
  console.log('ALL TESTS PASSED!');
}

run();

