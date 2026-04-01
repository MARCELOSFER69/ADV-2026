import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function archiveRetroactively() {
  console.log("Reading active_cases_in_archived_clients.json...");
  const dataPath = path.join(process.cwd(), 'active_cases_in_archived_clients.json');
  if (!fs.existsSync(dataPath)) {
    console.error("File not found:", dataPath);
    return;
  }
  
  const casesToArchive = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`Found ${casesToArchive.length} cases to archive.`);
  
  if (casesToArchive.length === 0) return;
  
  const caseIds = casesToArchive.map(c => c.id);
  const BATCH_SIZE = 100;
  let processed = 0;
  
  for (let i = 0; i < caseIds.length; i += BATCH_SIZE) {
      const batchIds = caseIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('cases')
        .update({ 
            status: 'Arquivado', 
            motivo_arquivamento: 'Sincronização em massa: Cliente estava arquivado'
        })
        .in('id', batchIds);
        
      if (error) {
          console.error(`Error archiving batch starting at index ${i}:`, error);
          // Continue with next batches despite error
      } else {
          processed += batchIds.length;
          console.log(`Processed ${processed}/${caseIds.length} cases...`);
      }
  }
  
  console.log("Archive process complete. Total archived:", processed);
}

archiveRetroactively();
