import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' }) 
dotenv.config({ path: '.env' })// Loads your .env.local variables

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function verifyConnection() {
  // Replace 'members' with your actual table name
  const { data, error } = await supabase
    .from('member') 
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Connection Failed:', error.message)
  } else {
    console.log('✅ Connection Successful! Data found:', data)
  }
}

verifyConnection()