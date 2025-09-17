import { useEffect, useState, useCallback } from 'react'
import { fetchSensorConfig, upsertSensorConfig, SensorConfig } from '@/lib/supabase'

export interface UseSensorConfigReturn {
  ecMin: number
  ecMax: number
  tankMax: number
  loading: boolean
  error: string | null
  save: (values: { ecMin: number; ecMax: number; tankMax: number }) => Promise<boolean>
  refresh: () => Promise<void>
}

const DEFAULTS = {
  ecMin: 1.2,
  ecMax: 2.0,
  tankMax: 320,
}

export function useSensorConfig(): UseSensorConfigReturn {
  const [ecMin, setEcMin] = useState<number>(DEFAULTS.ecMin)
  const [ecMax, setEcMax] = useState<number>(DEFAULTS.ecMax)
  const [tankMax, setTankMax] = useState<number>(DEFAULTS.tankMax)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const config = await fetchSensorConfig()
    if (config) {
      if (typeof config.ec_min === 'number') setEcMin(config.ec_min)
      if (typeof config.ec_max === 'number') setEcMax(config.ec_max)
      if (typeof config.tank_max === 'number') setTankMax(config.tank_max)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (values: { ecMin: number; ecMax: number; tankMax: number }) => {
    setLoading(true)
    setError(null)
    const ok = await upsertSensorConfig({ id: 1, ec_min: values.ecMin, ec_max: values.ecMax, tank_max: values.tankMax })
    if (!ok) setError('Failed to save configuration')
    await load()
    return ok
  }, [load])

  return { ecMin, ecMax, tankMax, loading, error, save, refresh: load }
}
