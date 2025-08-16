import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zfmltpujhotgaaypoyai.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbWx0cHVqaG90Z2FheXBveWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzc2MDgsImV4cCI6MjA2ODc1MzYwOH0.CLi_0grHoiy2js4umIbL9rZzP7stRzjJp3o-XKD547A'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const USER_ID = 'ed83d1fa-43a0-46c5-b6d1-98e92efbdd3f'