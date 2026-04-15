import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Recipe = {
  id: string
  title: string
  tags: string[]
  source_url: string | null
  ingredients: string[]
  steps: string[]
  notes: string | null
  photo_url: string | null
  created_at: string
  cook_log?: CookEntry[]
}

export type CookEntry = {
  id: string
  recipe_id: string
  cooked_at: string
  note: string | null
  created_at: string
}
