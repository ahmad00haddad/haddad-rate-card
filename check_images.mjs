import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const url = lines.find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1].replace(/['"\r]/g, '');
const key = lines.find(l => l.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY')).split('=')[1].replace(/['"\r]/g, '');

const sb = createClient(url, key);

sb.from('equipment').select('name, image_path').then(res => {
  res.data.forEach(d => {
    if (d.name.includes('DJI') || d.name.includes('SMALLRIG') || d.name.includes('K&F')) {
      console.log(d.name + ': ' + d.image_path);
    }
  });
});
