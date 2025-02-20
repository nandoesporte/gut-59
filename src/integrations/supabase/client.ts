
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Your public Supabase URL and anon key are exposed on the client - this is perfectly fine
// You can find them in your project's API settings
const SUPABASE_URL = "https://sxjafhzikftdenqnkcri.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4amFmaHppa2Z0ZGVucW5rY3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5ODQ0NTMsImV4cCI6MjA1NDU2MDQ1M30.qc8SAzrY0FJSz34BMeelH9CPWFZar5_1P-tAFMr4zp4"

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
