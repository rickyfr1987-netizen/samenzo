import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../database.types"

export type SupabaseBrowserClient = SupabaseClient<Database>

export type SupabaseHealthResult = {
  ok: boolean
  error: {
    code?: string
    message: string
  } | null
}

export const SUPABASE_HEALTH_QUERY = 'categorieen.select("id").limit(1)'

let browserClient: SupabaseBrowserClient | undefined

export function getSupabaseBrowserClient(): SupabaseBrowserClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase browser environment variables.")
  }

  browserClient ??= createClient<Database>(supabaseUrl, supabaseAnonKey)

  return browserClient
}

export async function checkSupabaseHealth(
  client: SupabaseBrowserClient = getSupabaseBrowserClient(),
): Promise<SupabaseHealthResult> {
  const { error } = await client.from("categorieen").select("id").limit(1)

  return {
    ok: !error,
    error: error
      ? {
          code: error.code,
          message: error.message,
        }
      : null,
  }
}
