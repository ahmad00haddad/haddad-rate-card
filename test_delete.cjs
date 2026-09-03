const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('C:\\Users\\ahmad\\.gemini\\antigravity\\scratch\\haddad-rate-card\\.env', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1].replace(/"/g, '').trim();
const key = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY')).split('=')[1].replace(/"/g, '').trim();

const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase.from('pricing_items').select('*').limit(1);
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  
  console.log('Got item:', data[0].id);
  const id = data[0].id;
  const { data: updateData, error: updateError } = await supabase.from('pricing_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  
  console.log('Update result from client:', updateData, updateError);
})();
