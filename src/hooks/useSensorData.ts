import { useState, useEffect } from 'react'
import { supabase, SensorMetric } from '../lib/supabase'

export interface UseSensorDataReturn {
  data: SensorMetric[] | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export const useSensorData = (limit: number = 10): UseSensorDataReturn => {
  const [data, setData] = useState<SensorMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: sensorData, error: fetchError } = await supabase
        .from('sensor_metrics')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      setData(sensorData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching sensor data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [limit])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

export const useLatestSensorData = (): UseSensorDataReturn => {
  return useSensorData(1)
}

export const useECData = (limit: number = 50): UseSensorDataReturn => {
  const [data, setData] = useState<SensorMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: sensorData, error: fetchError } = await supabase
        .from('sensor_metrics')
        .select('id, ec_val, watertemp, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      setData(sensorData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching EC data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [limit])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

export const useWaterLevelData = (limit: number = 50): UseSensorDataReturn => {
  const [data, setData] = useState<SensorMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: sensorData, error: fetchError } = await supabase
        .from('sensor_metrics')
        .select('id, waterlevel, watertemp, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      setData(sensorData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching water level data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [limit])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}
