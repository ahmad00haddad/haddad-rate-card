const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');

// Parse env
function getEnvVal(key) {
  const line = env.split('\n').find(l => l.startsWith(key + '='));
  if (!line) return '';
  return line.split('=').slice(1).join('=').trim().replace(/^"/, '').replace(/"$/, '');
}

const url = getEnvVal('VITE_SUPABASE_URL');
const apiKey = getEnvVal('VITE_SUPABASE_PUBLISHABLE_KEY');
const sb = createClient(url, apiKey);

sb.from('pricing_items')
  .select('id,name_ar,region,section,created_at')
  .is('deleted_at', null)
  .order('section')
  .order('region')
  .then(({ data, error }) => {
    if (error) return console.log('ERROR', error.message);
    console.log('Total items:', data.length);
    console.log('');
    data.forEach(i => {
      const flag = i.name_ar.includes('عمّان') && i.region === 'irbid' ? ' *** WRONG: amman name in irbid' :
                   i.name_ar.includes('إربد') && i.region === 'amman' ? ' *** WRONG: irbid name in amman' : '';
      console.log(i.region.padEnd(8), i.section.padEnd(12), i.name_ar + flag);
    });
  });
