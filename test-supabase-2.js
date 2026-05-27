const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bdbijbexfepwaytjxjqy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYmlqYmV4ZmVwd2F5dGp4anF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTIxNjgsImV4cCI6MjA5NDQyODE2OH0.HcbO3tFr1n_Q39TgTQXS1-yMCJeiCkV-Srx5zsX8ZUs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Starting Supabase connection test...");
  try {
    const start = Date.now();
    const { data, error } = await supabase
        .from('villas')
        .select('*')
        .neq('status', 'inactive');
    const duration = Date.now() - start;
    if (error) {
      console.error("Error from Supabase:", error);
    } else {
      console.log(`Success! Fetched ${data.length} villas in ${duration}ms`);
    }
  } catch (err) {
    console.error("Caught exception:", err);
  }
}

test();
