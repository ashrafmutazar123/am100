import { useState, useEffect } from 'react'
import { supabase, SensorMetric } from '../lib/supabase'

export interface UseRealtimeSensorDataReturn {
  data: SensorMetric[] | null
  loading: boolean
  error: string | null
  isConnected: boolean
}

export const useRealtimeSensorData = (limit: number = 10): UseRealtimeSensorDataReturn => {
  const [data, setData] = useState<SensorMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initial data fetch
    const fetchInitialData = async () => {
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
        console.error('Error fetching initial sensor data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()

    // Set up real-time subscription
    const channel = supabase
      .channel('sensor_metrics_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_metrics'
        },
        (payload) => {
          console.log('New sensor data received:', payload)
          // Add new data to the beginning of the array
          setData(prevData => {
            if (!prevData) return [payload.new as SensorMetric]
            return [payload.new as SensorMetric, ...prevData.slice(0, limit - 1)]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sensor_metrics'
        },
        (payload) => {
          console.log('Sensor data updated:', payload)
          // Update existing data
          setData(prevData => {
            if (!prevData) return null
            return prevData.map(item => 
              item.id === payload.new.id ? payload.new as SensorMetric : item
            )
          })
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [limit])

  return {
    data,
    loading,
    error,
    isConnected
  }
}
