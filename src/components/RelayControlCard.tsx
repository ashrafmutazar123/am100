import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Power, Zap, Activity, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import mqtt from 'mqtt';

interface RelayState {
  relay1_input: boolean;
  relay2_input: boolean;
  relay3_input: boolean;
  relay4_input: boolean;
  relay1_output: boolean;
  relay2_output: boolean;
  relay3_output: boolean;
  relay4_output: boolean;
  synced: boolean;
}

const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
const MQTT_TOPIC_RELAY = "dtu/34EAE7F0701C/relay";
const MQTT_TOPIC_DATA = "dtu/34EAE7F0701C/data";

const RelayControlCard: React.FC = () => {
  const [mqttClient, setMqttClient] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [relayState, setRelayState] = useState<RelayState>({
    relay1_input: false,
    relay2_input: false,
    relay3_input: false,
    relay4_input: false,
    relay1_output: false,
    relay2_output: false,
    relay3_output: false,
    relay4_output: false,
    synced: true
  });
  
  // Fertigation state
  const [isFertigating, setIsFertigating] = useState(false);
  const [fertigationDuration, setFertigationDuration] = useState('3');
  const [fertigationTimer, setFertigationTimer] = useState<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Connect to MQTT broker
  useEffect(() => {
    console.log('🔌 Connecting to MQTT broker for relay control...');
    
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `relay_control_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
    });

    client.on('connect', () => {
      console.log('✅ MQTT Connected for relay control');
      setIsConnected(true);
      
      // Subscribe to relay status updates
      client.subscribe(MQTT_TOPIC_DATA, (err) => {
        if (err) {
          console.error('❌ Failed to subscribe to relay data:', err);
        } else {
          console.log('📥 Subscribed to relay status updates');
        }
      });
    });

    client.on('message', (topic, message) => {
      if (topic === MQTT_TOPIC_DATA) {
        try {
          const data = JSON.parse(message.toString());
          
          // Check if message contains relay status
          if (data.relay1_output !== undefined) {
            console.log('📊 Relay status update:', data);
            setRelayState(data);
          }
        } catch (error) {
          // Ignore non-JSON messages (sensor hex data)
        }
      }
    });

    client.on('error', (error) => {
      console.error('❌ MQTT Error:', error);
      setIsConnected(false);
    });

    client.on('close', () => {
      console.log('🔌 MQTT Connection closed');
      setIsConnected(false);
    });

    setMqttClient(client);

    return () => {
      if (client) {
        client.end();
      }
    };
  }, []);

  const publishCommand = (command: string) => {
    if (!mqttClient || !isConnected) {
      toast({
        title: "Not Connected",
        description: "MQTT connection not established",
        variant: "destructive"
      });
      return;
    }

    console.log(`📤 Publishing command: ${command}`);
    mqttClient.publish(MQTT_TOPIC_RELAY, command, { qos: 0 }, (err: any) => {
      if (err) {
        console.error('❌ Failed to publish command:', err);
        toast({
          title: "Command Failed",
          description: `Failed to send ${command}`,
          variant: "destructive"
        });
      } else {
        console.log(`✅ Command sent: ${command}`);
        toast({
          title: "Command Sent",
          description: `Relay command: ${command}`,
        });
      }
    });
  };

  const handleRelayToggle = (relayNum: number, state: boolean) => {
    const command = state ? `R${relayNum}ON` : `R${relayNum}OFF`;
    publishCommand(command);
  };

  const handleFertigationToggle = () => {
    if (!isFertigating) {
      // Start fertigation
      setIsFertigating(true);
      
      // Turn on relay (assuming relay 1 is for fertigation)
      publishCommand('R1ON');
      
      // Calculate duration in ms (support fractional minutes)
      const durationMs = Math.round(parseFloat(fertigationDuration) * 60 * 1000);
      let durationLabel = '';
      const min = Math.floor(parseFloat(fertigationDuration));
      const sec = Math.round((parseFloat(fertigationDuration) - min) * 60);
      if (min === 0 && sec === 0) durationLabel = '0 second';
      else if (min === 0) durationLabel = `${sec} seconds`;
      else if (sec === 0) durationLabel = `${min} minute${min > 1 ? 's' : ''}`;
      else durationLabel = `${min} minute${min > 1 ? 's' : ''} ${sec} seconds`;
      
      toast({
        title: "Fertigation Started",
        description: `Running for ${durationLabel}`,
      });

      // Set auto-off timer
      const timer = setTimeout(() => {
        publishCommand('R1OFF');
        setIsFertigating(false);
        toast({
          title: "Fertigation Complete",
          description: `Fertigation cycle finished`,
        });
      }, durationMs);
      
      setFertigationTimer(timer);
    } else {
      // Stop fertigation
      if (fertigationTimer) {
        clearTimeout(fertigationTimer);
        setFertigationTimer(null);
      }
      
      publishCommand('R1OFF');
      setIsFertigating(false);
      
      toast({
        title: "Fertigation Stopped",
        description: "Manual stop",
        variant: "destructive"
      });
    }
  };

  const relays = [
    { num: 1, name: 'Relay 1', output: relayState.relay1_output },
    { num: 2, name: 'Relay 2', output: relayState.relay2_output },
    { num: 3, name: 'Relay 3', output: relayState.relay3_output },
    { num: 4, name: 'Relay 4', output: relayState.relay4_output },
  ];

  return (
    <Card className="backdrop-blur-xl bg-white/90 shadow-2xl hover:shadow-3xl 
      transition-all duration-300 border border-gray-100 overflow-hidden relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50 pointer-events-none"></div>
      
      <CardHeader className="relative z-10 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Manual Control
              </CardTitle>
            </div>
          </div>
          
          <Badge 
            variant={isConnected ? "default" : "secondary"}
            className={`px-3 py-1 text-xs font-semibold shadow-md ${
              isConnected 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <Activity className={`h-3 w-3 mr-1 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'Connected' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-6 space-y-6">
        {/* Manual Fertigation Section */}
        <div className="p-5 rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-orange-600" />
            Fertigation
          </h3>
          
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Duration
            </label>
              <Select value={fertigationDuration} onValueChange={setFertigationDuration}>
                <SelectTrigger className="bg-white border-2 border-orange-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 second</SelectItem>
                  <SelectItem value="0.5">30 seconds</SelectItem>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="1.5">1 minute 30 seconds</SelectItem>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="2.5">2 minutes 30 seconds</SelectItem>
                  <SelectItem value="3">3 minutes</SelectItem>
                  <SelectItem value="3.5">3 minutes 30 seconds</SelectItem>
                  <SelectItem value="4">4 minutes</SelectItem>
                  <SelectItem value="4.5">4 minutes 30 seconds</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="5.5">5 minutes 30 seconds</SelectItem>
                  <SelectItem value="6">6 minutes</SelectItem>
                  <SelectItem value="6.5">6 minutes 30 seconds</SelectItem>
                  <SelectItem value="7">7 minutes</SelectItem>
                  <SelectItem value="7.5">7 minutes 30 seconds</SelectItem>
                  <SelectItem value="8">8 minutes</SelectItem>
                  <SelectItem value="8.5">8 minutes 30 seconds</SelectItem>
                  <SelectItem value="9">9 minutes</SelectItem>
                  <SelectItem value="9.5">9 minutes 30 seconds</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="10.5">10 minutes 30 seconds</SelectItem>
                  <SelectItem value="11">11 minutes</SelectItem>
                  <SelectItem value="11.5">11 minutes 30 seconds</SelectItem>
                  <SelectItem value="12">12 minutes</SelectItem>
                  <SelectItem value="12.5">12 minutes 30 seconds</SelectItem>
                  <SelectItem value="13">13 minutes</SelectItem>
                  <SelectItem value="13.5">13 minutes 30 seconds</SelectItem>
                  <SelectItem value="14">14 minutes</SelectItem>
                  <SelectItem value="14.5">14 minutes 30 seconds</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="15.5">15 minutes 30 seconds</SelectItem>
                  <SelectItem value="16">16 minutes</SelectItem>
                  <SelectItem value="16.5">16 minutes 30 seconds</SelectItem>
                  <SelectItem value="17">17 minutes</SelectItem>
                  <SelectItem value="17.5">17 minutes 30 seconds</SelectItem>
                  <SelectItem value="18">18 minutes</SelectItem>
                  <SelectItem value="18.5">18 minutes 30 seconds</SelectItem>
                  <SelectItem value="19">19 minutes</SelectItem>
                  <SelectItem value="19.5">19 minutes 30 seconds</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="20.5">20 minutes 30 seconds</SelectItem>
                  <SelectItem value="21">21 minutes</SelectItem>
                  <SelectItem value="21.5">21 minutes 30 seconds</SelectItem>
                  <SelectItem value="22">22 minutes</SelectItem>
                  <SelectItem value="22.5">22 minutes 30 seconds</SelectItem>
                  <SelectItem value="23">23 minutes</SelectItem>
                  <SelectItem value="23.5">23 minutes 30 seconds</SelectItem>
                  <SelectItem value="24">24 minutes</SelectItem>
                  <SelectItem value="24.5">24 minutes 30 seconds</SelectItem>
                  <SelectItem value="25">25 minutes</SelectItem>
                  <SelectItem value="25.5">25 minutes 30 seconds</SelectItem>
                  <SelectItem value="26">26 minutes</SelectItem>
                  <SelectItem value="26.5">26 minutes 30 seconds</SelectItem>
                  <SelectItem value="27">27 minutes</SelectItem>
                  <SelectItem value="27.5">27 minutes 30 seconds</SelectItem>
                  <SelectItem value="28">28 minutes</SelectItem>
                  <SelectItem value="28.5">28 minutes 30 seconds</SelectItem>
                  <SelectItem value="29">29 minutes</SelectItem>
                  <SelectItem value="29.5">29 minutes 30 seconds</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="30.5">30 minutes 30 seconds</SelectItem>
                  <SelectItem value="31">31 minutes</SelectItem>
                  <SelectItem value="31.5">31 minutes 30 seconds</SelectItem>
                  <SelectItem value="32">32 minutes</SelectItem>
                  <SelectItem value="32.5">32 minutes 30 seconds</SelectItem>
                  <SelectItem value="33">33 minutes</SelectItem>
                  <SelectItem value="33.5">33 minutes 30 seconds</SelectItem>
                  <SelectItem value="34">34 minutes</SelectItem>
                  <SelectItem value="34.5">34 minutes 30 seconds</SelectItem>
                  <SelectItem value="35">35 minutes</SelectItem>
                  <SelectItem value="35.5">35 minutes 30 seconds</SelectItem>
                  <SelectItem value="36">36 minutes</SelectItem>
                  <SelectItem value="36.5">36 minutes 30 seconds</SelectItem>
                  <SelectItem value="37">37 minutes</SelectItem>
                  <SelectItem value="37.5">37 minutes 30 seconds</SelectItem>
                  <SelectItem value="38">38 minutes</SelectItem>
                  <SelectItem value="38.5">38 minutes 30 seconds</SelectItem>
                  <SelectItem value="39">39 minutes</SelectItem>
                  <SelectItem value="39.5">39 minutes 30 seconds</SelectItem>
                  <SelectItem value="40">40 minutes</SelectItem>
                  <SelectItem value="40.5">40 minutes 30 seconds</SelectItem>
                  <SelectItem value="41">41 minutes</SelectItem>
                  <SelectItem value="41.5">41 minutes 30 seconds</SelectItem>
                  <SelectItem value="42">42 minutes</SelectItem>
                  <SelectItem value="42.5">42 minutes 30 seconds</SelectItem>
                  <SelectItem value="43">43 minutes</SelectItem>
                  <SelectItem value="43.5">43 minutes 30 seconds</SelectItem>
                  <SelectItem value="44">44 minutes</SelectItem>
                  <SelectItem value="44.5">44 minutes 30 seconds</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="45.5">45 minutes 30 seconds</SelectItem>
                  <SelectItem value="46">46 minutes</SelectItem>
                  <SelectItem value="46.5">46 minutes 30 seconds</SelectItem>
                  <SelectItem value="47">47 minutes</SelectItem>
                  <SelectItem value="47.5">47 minutes 30 seconds</SelectItem>
                  <SelectItem value="48">48 minutes</SelectItem>
                  <SelectItem value="48.5">48 minutes 30 seconds</SelectItem>
                  <SelectItem value="49">49 minutes</SelectItem>
                  <SelectItem value="49.5">49 minutes 30 seconds</SelectItem>
                  <SelectItem value="50">50 minutes</SelectItem>
                  <SelectItem value="50.5">50 minutes 30 seconds</SelectItem>
                  <SelectItem value="51">51 minutes</SelectItem>
                  <SelectItem value="51.5">51 minutes 30 seconds</SelectItem>
                  <SelectItem value="52">52 minutes</SelectItem>
                  <SelectItem value="52.5">52 minutes 30 seconds</SelectItem>
                  <SelectItem value="53">53 minutes</SelectItem>
                  <SelectItem value="53.5">53 minutes 30 seconds</SelectItem>
                  <SelectItem value="54">54 minutes</SelectItem>
                  <SelectItem value="54.5">54 minutes 30 seconds</SelectItem>
                  <SelectItem value="55">55 minutes</SelectItem>
                  <SelectItem value="55.5">55 minutes 30 seconds</SelectItem>
                  <SelectItem value="56">56 minutes</SelectItem>
                  <SelectItem value="56.5">56 minutes 30 seconds</SelectItem>
                  <SelectItem value="57">57 minutes</SelectItem>
                  <SelectItem value="57.5">57 minutes 30 seconds</SelectItem>
                  <SelectItem value="58">58 minutes</SelectItem>
                  <SelectItem value="58.5">58 minutes 30 seconds</SelectItem>
                  <SelectItem value="59">59 minutes</SelectItem>
                  <SelectItem value="59.5">59 minutes 30 seconds</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <Button
            onClick={handleFertigationToggle}
            disabled={!isConnected}
            className={`w-full py-6 text-lg font-bold shadow-lg transition-all duration-300 ${
              isFertigating
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 animate-pulse'
                : 'bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500'
            }`}
          >
            <Droplets className="h-5 w-5 mr-2" />
            {isFertigating ? 'Fertigation Running' : 'Run Fertigation'}
          </Button>
        </div>

        {/* Individual Relay Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {relays.map((relay) => (
            <div 
              key={relay.num}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                relay.output
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 shadow-lg'
                  : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    relay.output 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                      : 'bg-gray-200'
                  }`}>
                    <Power className={`h-4 w-4 ${
                      relay.output ? 'text-white' : 'text-gray-500'
                    }`} />
                  </div>
                  <span className="font-bold text-gray-800">{relay.name}</span>
                </div>
                
                <Switch
                  checked={relay.output}
                  onCheckedChange={(checked) => handleRelayToggle(relay.num, checked)}
                  disabled={!isConnected}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RelayControlCard;