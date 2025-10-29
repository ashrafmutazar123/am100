import { useEffect, useRef, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { saveSensorReading } from '@/lib/supabase';

export interface SensorDataHistory {
  id: number;
  device_id: string;
  ec_val: number;        // µS/cm
  watertemp: number;     // °C
  waterlevel: number;    // mmH2O
  updated_at: string;    // ISO
}

const MAX_HISTORY = 50;
const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_HEX_DATA = 'dtu/34EAE7F0701C/data';  // Subscribe to RAW HEX topic

export function useMqttSensorData() {
  const [dataHistory, setDataHistory] = useState<SensorDataHistory[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(1);
  const clientRef = useRef<MqttClient | null>(null);
  
  // State to accumulate sensor readings
  const latestDataRef = useRef({
    ec_val: 0,
    watertemp: 0,
    waterlevel: 0,
    hasEcTemp: false,      // Track if we've received EC/Temp
    hasWaterLevel: false,  // Track if we've received Water Level
  });

  // Save to Supabase when we have complete data
  const saveToSupabase = async () => {
    if (latestDataRef.current.hasEcTemp && latestDataRef.current.hasWaterLevel) {
      await saveSensorReading({
        device_id: 'sensor_01',
        ec_val: latestDataRef.current.ec_val,
        watertemp: latestDataRef.current.watertemp,
        waterlevel: latestDataRef.current.waterlevel,
      });
      
      // Reset flags after saving
      latestDataRef.current.hasEcTemp = false;
      latestDataRef.current.hasWaterLevel = false;
    }
  };

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: 'ashraf_mutazar_dashboard_' + Math.random().toString(16).slice(2, 8),
      clean: true,
      reconnectPeriod: 1000,
    });
    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      setIsConnected(true);
      setError(null);
      
      // Subscribe to HEX data topic
      client.subscribe(TOPIC_HEX_DATA, (err) => {
        if (err) {
          console.error('Subscribe error:', err);
          setError(`Subscribe error: ${err.message}`);
        } else {
          console.log(`📡 Subscribed to: ${TOPIC_HEX_DATA} (HEX mode)`);
        }
      });
    });

    client.on('message', (_topic, msg) => {
      try {
        // Parse raw HEX bytes (Modbus RTU response)
        const data = new Uint8Array(msg);
        
        if (data.length < 5) return;
        
        const slaveId = data[0];
        const funcCode = data[1];
        const byteCount = data[2];
        
        let updated = false;
        
        // EC/Temp sensor (0x03)
        if (slaveId === 0x03 && funcCode === 0x03 && byteCount === 0x08 && data.length >= 13) {
          // Parse EC (4 bytes, big-endian)
          const ecRaw = (data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6];
          // Parse Temp (2 bytes, big-endian)
          const tempRaw = (data[7] << 8) | data[8];
          
          latestDataRef.current.ec_val = ecRaw / 100;  // µS/cm
          latestDataRef.current.watertemp = tempRaw / 10;  // °C
          latestDataRef.current.hasEcTemp = true;
          
          console.log(`📊 HEX→ EC: ${latestDataRef.current.ec_val} µS/cm, Temp: ${latestDataRef.current.watertemp}°C`);
          updated = true;
          
          // Try to save to Supabase if we have all data
          saveToSupabase();
        }
        
        // Water Level sensor (0x0D)
        else if (slaveId === 0x0D && funcCode === 0x03 && byteCount === 0x02 && data.length >= 7) {
          // Parse Water Level (2 bytes, big-endian)
          const wl = (data[3] << 8) | data[4];
          latestDataRef.current.waterlevel = wl;
          latestDataRef.current.hasWaterLevel = true;
          
          console.log(`💧 HEX→ Water Level: ${wl} mmH₂O`);
          updated = true;
          
          // Try to save to Supabase if we have all data
          saveToSupabase();
        }
        
        // Add to history if we got new data
        if (updated) {
          const item: SensorDataHistory = {
            id: counterRef.current++,
            device_id: 'sensor_01',
            ec_val: latestDataRef.current.ec_val,
            watertemp: latestDataRef.current.watertemp,
            waterlevel: latestDataRef.current.waterlevel,
            updated_at: new Date().toISOString(),
          };

          setDataHistory((prev) => {
            const next = [item, ...prev];
            if (next.length > MAX_HISTORY) next.pop();
            return next;
          });
        }
      } catch (e: any) {
        console.error('Parse error:', e);
        setError(`Parse error: ${e.message}`);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
      setError(err.message);
      setIsConnected(false);
    });
    
    client.on('close', () => {
      console.log('🔌 Disconnected from MQTT broker');
      setIsConnected(false);
    });
    
    client.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });

    return () => {
      console.log('🛑 Cleaning up MQTT connection');
      client.end(true);
    };
  }, []);

  return {
    dataHistory,
    isConnected,
    error,
  };
}
