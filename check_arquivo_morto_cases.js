import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  let allClients = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  
  console.log("Fetching archived clients...");
  while (true) {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome_completo, status')
      .ilike('status', 'arquivado')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
    if (clientsError) {
        console.error(clientsError);
        return;
    }
    
    if (!clients || clients.length === 0) break;
    
    allClients.push(...clients);
    
    if (clients.length < PAGE_SIZE) break;
    page++;
  }
  
  console.log(`Found ${allClients.length} total archived clients.`);
  
  const clientIds = allClients.map(c => c.id);
  
  let activeCases = [];
  const BATCH_SIZE = 50; // Reduce batch size to prevent HeadersOverflowError (URI too long)
  let processed = 0;
  console.log("Checking cases...");
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, numero_processo, tipo, status, client_id, titulo')
      .in('client_id', batch)
      .eq('tipo', 'Seguro Defeso'); 
      
    if (casesError) {
        console.error(casesError);
        return;
    }
    
    if (cases && cases.length > 0) {
        const notArchived = cases.filter(c => c.status && c.status.toLowerCase() !== 'arquivado');
        activeCases.push(...notArchived);
    }
    
    processed += batch.length;
    if (processed % 250 === 0) {
        console.log(`Processed ${processed}/${clientIds.length} clients...`);
    }
  }

  if (activeCases.length > 0) {
      console.log(`\nFound ${activeCases.length} active Seguro Defeso cases for archived clients.`);
      // Let's add the client names to the activeCases for easier identification
      for (const ac of activeCases) {
          const client = allClients.find(c => c.id === ac.client_id);
          ac.client_name = client ? client.nome_completo : 'Unknown';
      }
      fs.writeFileSync("active_cases_in_archived_clients.json", JSON.stringify(activeCases, null, 2));
      console.log("Saved results to active_cases_in_archived_clients.json");
      console.log(JSON.stringify(activeCases, null, 2));
  } else {
      console.log("\nNo active Seguro Defeso cases found for archived clients.");
  }
}

check();
