'use client';

import { useState, useEffect } from 'react';
import { MqttProvider } from '@/lib/mqtt-context';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DeviceDashboard from '@/components/DeviceDashboard';

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Restore last selected device from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mqtt_selected_device');
    if (saved) setSelectedId(saved);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    localStorage.setItem('mqtt_selected_device', id);
  };

  return (
    <MqttProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar selectedId={selectedId} onSelect={handleSelect} />
          <main className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <DeviceDashboard selectedId={selectedId} />
          </main>
        </div>
      </div>
    </MqttProvider>
  );
}
