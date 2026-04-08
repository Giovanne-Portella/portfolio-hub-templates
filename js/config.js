// Supabase client configuration
// Replace with your project credentials from https://supabase.com/dashboard
const SUPABASE_URL = 'https://hcfnmqywojgfpbqwqsxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZm5tcXl3b2pnZnBicXdxc3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTQ3MjgsImV4cCI6MjA5MTE3MDcyOH0.ZV0HtiKdnHcLi9jMgzx7zaBWvi28BggMeS7HeNp_Q-A';

// Overwrite the CDN namespace with the client instance so all modules can use `supabase` directly
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
