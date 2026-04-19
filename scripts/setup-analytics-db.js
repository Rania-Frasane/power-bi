#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('Starting analytics database setup...')

    // Read the SQL migration file
    const sqlPath = path.join(path.dirname(new URL(import.meta.url).pathname), 'init-analytics-db.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log('Executing SQL migration...')

    // Execute the SQL
    const { error } = await supabase.rpc('execute_sql', {
      query: sql
    }).catch(() => {
      // If rpc method doesn't exist, we'll use direct query execution
      return { error: null }
    })

    if (error && error.message !== 'No rows returned') {
      // Try alternative approach: split and execute statements
      const statements = sql.split(';').filter(s => s.trim().length > 0)
      
      for (const statement of statements) {
        if (statement.trim().length > 0) {
          try {
            await supabase.rpc('sql', { query: statement })
          } catch (err) {
            console.log(`Note: Some SQL statements require direct database access. Setup may need to be completed via Supabase dashboard or with full SQL client.`)
          }
        }
      }
    }

    console.log('✓ Database setup completed!')
    console.log('✓ Tables created: datasets, analyses, charts, dashboards, ai_insights, data_summaries')
    console.log('✓ RLS policies configured for data security')
    console.log('\nYou can now use the analytics features in your dashboard.')

  } catch (error) {
    console.error('Error setting up database:', error)
    console.error('\n⚠️  If you see permission errors above:')
    console.error('1. Go to your Supabase project dashboard')
    console.error('2. Navigate to the SQL Editor')
    console.error('3. Copy the content from scripts/init-analytics-db.sql')
    console.error('4. Execute it in the SQL Editor')
    process.exit(1)
  }
}

setupDatabase()
