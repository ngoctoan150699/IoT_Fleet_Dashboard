'use client';

import { useState, useEffect } from 'react';
import { MqttProvider } from '@/lib/mqtt-context';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DeviceDashboard from '@/components/DeviceDashboard';

export default function Home() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Restore last selected devices
  useEffect(() => {
    const saved = localStorage.getItem('mqtt_selected_devices');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSelectedIds(parsed);
      } catch (e) {
        console.warn('Failed parsing selected ids', e);
      }
    }
    
    // Check initial theme from html tag
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  const handleSelect = (ids: string[]) => {
    setSelectedIds(ids);
    localStorage.setItem('mqtt_selected_devices', JSON.stringify(ids));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Sync theme state with document class on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  return (
    <MqttProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Header theme={theme} toggleTheme={toggleTheme} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar selectedIds={selectedIds} onSelectChange={handleSelect} />
          <main className="flex flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <DeviceDashboard selectedIds={selectedIds} />
          </main>
        </div>
      </div>
    </MqttProvider>
  );
}
