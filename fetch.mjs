import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].replace(/[\"\'\r]/g, '').trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].replace(/[\"\'\r]/g, '').trim();
});
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const supabase = createClient(url, key);
  const { data } = await supabase.from('pricing_items').select('name_ar, section, region, price_min, price_max');
  console.log(JSON.stringify(data, null, 2));
});
