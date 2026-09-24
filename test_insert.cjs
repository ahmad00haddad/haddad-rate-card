
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const payload = { name: 'Test Equip', description: '', category: '', original_price: 0, image_path: '', is_available: true };
  const { data, error } = await supabase.from('equipment').insert(payload);
  console.log('Error:', error);
}
run();

