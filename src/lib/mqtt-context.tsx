'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import mqtt, { MqttClient } from 'mqtt';

// ─── Types ───────────────────────────────────────────────────────────
export interface Device {
  id: string;
  topic: string;
  online: boolean;
  led_status: boolean;
  firmware_version?: string;
}

interface MqttContextValue {
  connected: boolean;
  loading: boolean;
  error: string | null;
  devices: Device[];
  url: string;
  topic: string;
  setUrl: (u: string) => void;
  setTopic: (t: string) => void;
  connect: () => void;
  disconnect: () => void;
  rpc: (deviceId: string, method: string, params?: Record<string, unknown>) => Promise<unknown>;
  forgetDevice: (device: Device) => void;
}

const DEFAULT_URL = 'wss://broker.hivemq.com:8884/mqtt';
const DEFAULT_TOPIC = 'mg_mqtt_dashboard';

const MqttContext = createContext<MqttContextValue | null>(null);

export function useMqtt() {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useMqtt must be used within MqttProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────
export function MqttProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [url, setUrl] = useState(DEFAULT_URL);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);

  const clientRef = useRef<MqttClient | null>(null);
  const handlersRef = useRef<Record<string, (msg: Record<string, unknown>) => void>>({});

  // Load saved settings from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem('mqtt_url');
    const savedTopic = localStorage.getItem('mqtt_topic');
    if (savedUrl) setUrl(savedUrl);
    if (savedTopic) setTopic(savedTopic);
  }, []);

  // ── updateDevices helper (keep sorted: online first, then alphabetical) ──
  const updateDevices = useCallback((incoming: Device) => {
    setDevices(prev => {
      const filtered = prev.filter(d => d.id !== incoming.id);
      filtered.push(incoming);
      filtered.sort((a, b) =>
        a.online && !b.online ? -1 : !a.online && b.online ? 1 : a.id < b.id ? -1 : 1,
      );
      return [...filtered];
    });
  }, []);

  // ── connect ──
  const connectBroker = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    setLoading(true);
    setError(null);
    setDevices([]);

    localStorage.setItem('mqtt_url', url);
    localStorage.setItem('mqtt_topic', topic);

    const client = mqtt.connect(url, { connectTimeout: 5000, reconnectPeriod: 0 });
    clientRef.current = client;

    client.on('connect', () => {
      setLoading(false);
      setError(null);
      setConnected(true);

      const statusTopic = `${topic}/+/status`;
      const txTopic = `${topic}/+/tx`;
      client.subscribe(statusTopic);
      client.subscribe(txTopic);
    });

    client.on('message', (_topic: string, message: Buffer) => {
      const raw = message.toString();
      console.log(`[MQTT] ${_topic}: ${raw}`);
      if (!raw) return;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return;
      }

      if (_topic.endsWith('/status')) {
        const params = parsed.params as Record<string, unknown> | undefined;
        if (!params) return;
        const deviceId = _topic.replace(`${topic}/`, '').replace('/status', '');
        const device: Device = {
          id: deviceId,
          topic: _topic,
          online: params.status === 'online',
          led_status: !!params.led_status,
          firmware_version: (params.firmware_version as string) || undefined,
        };
        updateDevices(device);
      } else if (_topic.endsWith('/tx')) {
        // Debug: log raw response để xem format ID từ thiết bị
        console.log('[MQTT RX /tx] Raw parsed:', JSON.stringify(parsed));
        console.log('[MQTT RX /tx] parsed.id type:', typeof parsed.id, 'value:', parsed.id);

        const incomingId = parsed.id !== undefined && parsed.id !== null ? String(parsed.id) : '';
        if (!incomingId) {
          console.warn('[MQTT RX /tx] No ID in response, skipping');
          return;
        }

        console.log('[MQTT RX /tx] Looking for handler with key:', JSON.stringify(incomingId));
        console.log('[MQTT RX /tx] Pending handler keys:', Object.keys(handlersRef.current));

        const handler = handlersRef.current[incomingId];
        if (handler) {
          console.log('[MQTT RX /tx] ✅ Handler found, resolving promise');
          handler(parsed);
          delete handlersRef.current[incomingId];
        } else {
          console.warn('[MQTT RX /tx] ❌ No handler matched! ID mismatch.');
        }
      }
    });

    client.on('error', () => {
      setError('Không thể kết nối đến MQTT broker.');
      setLoading(false);
    });

    client.on('close', () => {
      if (!connected) {
        setError('Kết nối bị đóng.');
        setLoading(false);
      }
      setConnected(false);
    });
  }, [url, topic, connected, updateDevices]);

  // ── disconnect ──
  const disconnectBroker = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    setConnected(false);
    setDevices([]);
  }, []);

  // ── RPC publish ──
  const rpc = useCallback(
    (deviceId: string, method: string, params?: Record<string, unknown>): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        if (!clientRef.current) return reject(new Error('Not connected'));

        // Dùng number thay cho Math.random string vì thư viện nhúng ở C
        // của STM32 dễ dàng parsing JSON struct dạng numeric ID hơn
        const idNum = Math.floor(Math.random() * 100000) + Date.now();
        const idStr = String(idNum);

        const timeout = setTimeout(() => {
          delete handlersRef.current[idStr];
          reject(new Error('Request timed out'));
        }, 30000);

        handlersRef.current[idStr] = (msg) => {
          clearTimeout(timeout);
          resolve(msg);
        };

        const rxTopic = `${topic}/${deviceId}/rx`;
        const payload: Record<string, unknown> = { method, id: idNum };
        if (params) payload.params = params;

        console.log(`[MQTT TX] ${rxTopic}: ${JSON.stringify(payload)}`);
        clientRef.current.publish(rxTopic, JSON.stringify(payload));
      });
    },
    [topic],
  );

  // ── forgetDevice ──
  const forgetDevice = useCallback(
    (device: Device) => {
      if (clientRef.current) {
        clientRef.current.publish(device.topic, '', { retain: true });
      }
      setDevices(prev => prev.filter(d => d.id !== device.id));
    },
    [],
  );

  return (
    <MqttContext.Provider
      value={{
        connected,
        loading,
        error,
        devices,
        url,
        topic,
        setUrl,
        setTopic,
        connect: connectBroker,
        disconnect: disconnectBroker,
        rpc,
        forgetDevice,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}
