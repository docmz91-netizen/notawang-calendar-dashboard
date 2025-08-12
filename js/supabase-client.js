import { CONFIG } from './config.js';

// Initialize Supabase client
export const supabase = window.supabase.createClient(
    CONFIG.SUPABASE_URL, 
    CONFIG.SUPABASE_ANON_KEY
);

// Test connection
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('transactions').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error);
        return false;
    }
}