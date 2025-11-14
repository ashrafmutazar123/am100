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
  waterlevel_min: number | null
  waterlevel_max: number | null
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
    return null;
  }
  return data as SensorConfig | null;
}

export async function upsertSensorConfig(config: Omit<SensorConfig, 'updated_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('sensor_config')
    .upsert({ ...config, id: 1 }, { onConflict: 'id' })

  if (error) {
    console.error('upsertSensorConfig error', error);
    return false;
  }
  return true;
}

/**
 * Save sensor reading to Supabase
 * Called whenever new MQTT data arrives
 */
export async function saveSensorReading(data: {
  device_id: string
  ec_val: number
  watertemp: number
  waterlevel: number
}) {
  try {
    const { data: result, error } = await supabase
      .from('sensor_metrics')  // ✅ Changed from 'sensor_data' to 'sensor_metrics'
      .insert([
        {
          device_id: data.device_id,
          ec_val: data.ec_val,
          watertemp: data.watertemp,
          waterlevel: data.waterlevel,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('❌ Supabase insert error:', error)
      return { success: false, error }
    }

    console.log('✅ Saved to Supabase:', result)
    return { success: true, data: result }
  } catch (err) {
    console.error('❌ Supabase save exception:', err)
    return { success: false, error: err }
  }
}

/**
 * Fetch recent sensor readings from Supabase
 */
export async function fetchRecentReadings(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('sensor_metrics')  // ✅ Changed from 'sensor_data' to 'sensor_metrics'
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Supabase fetch error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('❌ Supabase fetch exception:', err)
    return { success: false, error: err }
  }
}

// Schedule types and functions
export interface RelaySchedule {
  id: string
  name: string
  hour: number
  minute: number
  ampm: string | null
  relay: string
  state: string
  duration: number
  days: string[]
  enabled: boolean
  created_at?: string
  updated_at?: string
}

/**
 * Fetch all relay schedules from Supabase
 */
export async function fetchSchedules(): Promise<RelaySchedule[]> {
  const { data, error } = await supabase
    .from('relay_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ fetchSchedules error:', error)
    return []
  }
  return data as RelaySchedule[]
}

/**
 * Create a new relay schedule in Supabase
 */
export async function createSchedule(schedule: Omit<RelaySchedule, 'id' | 'created_at' | 'updated_at'>): Promise<RelaySchedule | null> {
  console.log('🔵 createSchedule called with:', schedule);
  
  const { data, error } = await supabase
    .from('relay_schedules')
    .insert([schedule])
    .select()
    .single()

  if (error) {
    console.error('❌ createSchedule error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return null
  }
  
  console.log('✅ createSchedule success:', data);
  return data as RelaySchedule
}

/**
 * Delete a relay schedule from Supabase
 */
export async function deleteSchedule(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('relay_schedules')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ deleteSchedule error:', error)
    return false
  }
  return true
}

/**
 * Update a relay schedule's enabled status
 */
export async function toggleScheduleEnabled(id: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('relay_schedules')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('❌ toggleScheduleEnabled error:', error)
    return false
  }
  return true
}
