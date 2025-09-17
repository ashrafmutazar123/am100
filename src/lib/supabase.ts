import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phxukzoprpkevwhblfun.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoeHVrem9wcnBrZXZ3aGJsZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMTU3MDAsImV4cCI6MjA3Mjg5MTcwMH0._AhlMhqN59PcYxBq0W5Fejhom5uRMq_-LK4bFFD4HUo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface SensorMetric {
  id: number
  device_id: string
  ec_val: number
  watertemp: number
  waterlevel: number
  updated_at: string
}

export interface SensorDataResponse {
  data: SensorMetric[] | null
  error: any
}

// Single-row configuration table: sensor_config
export interface SensorConfig {
  id: number
  ec_min: number | null
  ec_max: number | null
  tank_max: number | null
  updated_at?: string
}

export async function fetchSensorConfig(): Promise<SensorConfig | null> {
  const { data, error } = await supabase
    .from('sensor_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('fetchSensorConfig error', error)
    return null
  }
  return data as SensorConfig | null
}

export async function upsertSensorConfig(config: Omit<SensorConfig, 'updated_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('sensor_config')
    .upsert({ ...config, id: 1 }, { onConflict: 'id' })

  if (error) {
    console.error('upsertSensorConfig error', error)
    return false
  }
  return true
}
