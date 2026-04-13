'use client';

import { useMqtt } from '@/lib/mqtt-context';
import { HiOutlineSignal, HiOutlineGlobeAlt, HiOutlineMoon, HiOutlineSun, HiOutlineArrowLeftOnRectangle } from 'react-icons/hi2';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLogout: () => void;
}

export default function Header({ theme, toggleTheme, onLogout }: HeaderProps) {
  const { connected, loading, url, topic, setUrl, setTopic, connect, disconnect } = useMqtt();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-colors">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Logo / Title */}
        <div className="flex items-center gap-3 mr-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
            <HiOutlineSignal className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white whitespace-nowrap">
            THACO IoT Fleet
          </h1>
        </div>

        {/* MQTT Server Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
            <HiOutlineGlobeAlt className="h-3.5 w-3.5" />
            Broker
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={connected}
            placeholder="wss://broker..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Root Topic Input */}
        <div className="flex items-center gap-2 w-48 shrink-0">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            disabled={connected}
            placeholder="root_topic"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Action Buttons Container */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <HiOutlineSun className="h-4 w-4" /> : <HiOutlineMoon className="h-4 w-4" />}
          </button>

          {/* Connect / Disconnect Button */}
          <button
            onClick={connected ? disconnect : connect}
            disabled={loading}
            className={`
              relative flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold shadow-lg transition-all duration-200 
              ${
                connected
                  ? 'bg-red-500/90 text-white shadow-red-500/20 hover:bg-red-500 hover:shadow-red-500/30'
                  : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:brightness-110'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
              </svg>
            )}
            {connected ? 'Disconnect' : 'Connect'}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Đăng xuất"
          >
            <HiOutlineArrowLeftOnRectangle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
