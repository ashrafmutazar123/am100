import { useState, useEffect, useRef } from 'react'
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
  const lastFetchTime = useRef<number>(0)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const fetchInitialData = async (isBackgroundRefresh = false) => {
      try {
        // Only show loading on initial load, not on background refreshes
        if (isInitialLoad.current && !isBackgroundRefresh) {
          setLoading(true)
        }
        setError(null)
        
        const { data: sensorData, error: fetchError } = await supabase
          .from('sensor_metrics')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(limit)

        if (fetchError) {
          throw fetchError
        }

        // Only update data if we actually got new data or it's the first load
        if (sensorData) {
          const hasNewData = !data || 
            sensorData.length !== data.length || 
            (sensorData.length > 0 && data.length > 0 && 
             new Date(sensorData[0].updated_at).getTime() !== new Date(data[0].updated_at).getTime())

          if (hasNewData || isInitialLoad.current) {
            setData(sensorData)
            lastFetchTime.current = Date.now()
          }
        }
        
        // Check connection status based on data freshness
        if (sensorData && sensorData.length > 0) {
          const lastUpdate = new Date(sensorData[0].updated_at).getTime()
          const now = Date.now()
          const timeDiff = now - lastUpdate
          setIsConnected(timeDiff < 5 * 60 * 1000) // 5 minutes threshold
        } else {
          setIsConnected(false)
        }
      } catch (err) {
        // Don't clear existing data on background refresh errors
        if (!isBackgroundRefresh) {
          setError(err instanceof Error ? err.message : 'An error occurred')
          console.error('Error fetching sensor data:', err)
        }
        setIsConnected(false)
      } finally {
        if (isInitialLoad.current) {
          setLoading(false)
          isInitialLoad.current = false
        }
      }
    }

    // Initial data fetch
    fetchInitialData()

    // Set up real-time subscription for live updates
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
          setData(prevData => {
            if (!prevData) return [payload.new as SensorMetric]
            
            const newItem = payload.new as SensorMetric
            const exists = prevData.some(item => item.id === newItem.id)
            if (exists) return prevData
            
            // Add new data and maintain limit
            return [newItem, ...prevData.slice(0, limit - 1)]
          })
          setIsConnected(true)
          setError(null)
          lastFetchTime.current = Date.now()
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
          setData(prevData => {
            if (!prevData) return [payload.new as SensorMetric]
            return prevData.map(item => 
              item.id === (payload.new as SensorMetric).id 
                ? payload.new as SensorMetric 
                : item
            )
          })
          setIsConnected(true)
          setError(null)
          lastFetchTime.current = Date.now()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Gentle background refresh only if no real-time updates for a while
    intervalId = setInterval(() => {
      const timeSinceLastFetch = Date.now() - lastFetchTime.current
      
      // Only do background refresh if no updates for 2 minutes
      if (timeSinceLastFetch > 2 * 60 * 1000) {
        fetchInitialData(true) // Pass true for background refresh
      }
    }, 30000) // Check every 30 seconds instead of 10

    return () => {
      if (intervalId) clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [limit]) // Remove 'data' from dependencies to prevent infinite loops

  return {
    data,
    loading,
    error,
    isConnected
  }
}
