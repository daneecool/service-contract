import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Customer = {
  id: string
  company: string
  contact_person: string
  email?: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

export type Contract = {
  id: string
  customer_id: string
  equipment_type: string
  brand: string
  model?: string
  serial_number?: string
  last_service_date?: string
  contract_type: string
  contract_period: number
  contract_start_date?: string
  contract_end_date?: string
  remarks?: string
  created_at: string
  updated_at: string
  customers?: Customer
}

export const EQUIPMENT_TYPES = ["Heated Dryer", "Refrigerant Dryer", "Compressor", "Vacuum Pump"]

export const BRANDS = [
  "Everair",
  "Beko",
  "Genesis",
  "Friulair",
  "Donaldson",
  "Hitachi",
  "Sullair",
  "Atlas Copco",
  "Kobelco",
  "Ingersoll Rand",
]

export const CONTRACT_TYPES = ["Quarterly Service", "Half-year Service", "Annual Service"]
