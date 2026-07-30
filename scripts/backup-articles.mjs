// Script: Backup Articles to JSON
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backup() {
  console.log('Backing up articles...');
  
  const { data, error } = await supabase
    .from('articles')
    .select('*');
    
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  const backupFile = `articles-backup-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  
  console.log(`✅ Backup saved: ${backupFile}`);
  console.log(`Total articles: ${data?.length || 0}`);
}

backup();
