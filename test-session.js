const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bdbijbexfepwaytjxjqy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYmlqYmV4ZmVwd2F5dGp4anF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTIxNjgsImV4cCI6MjA5NDQyODE2OH0.HcbO3tFr1n_Q39TgTQXS1-yMCJeiCkV-Srx5zsX8ZUs';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function test() {
  console.log("Logging in...");
  try {
    // Let's sign in with a test admin credential or see if we can get a session.
    // Since we don't have password here, we can check the general configuration by checking the token of a new signup, 
    // or we can look at the JWT itself to see the 'exp' field!
    // Wait! The anon key itself is a JWT! Let's decode the anon key to see its 'exp' (expiration)!
    // Wait, the anon key is valid until 2094 (expi: 2094428168).
    // What about a generated user session token?
    // Let's try to sign in. Do we have the user credentials? 
    // Let's check if we can query public villas first.
    console.log("Anon Key:", supabaseAnonKey);
    const parts = supabaseAnonKey.split('.');
    if (parts.length === 3) {
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      console.log("Decoded Anon Key Payload:", JSON.parse(payload));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
