'use client';

import { useMqtt } from '@/lib/mqtt-context';
import { HiOutlineSignal, HiOutlineGlobeAlt } from 'react-icons/hi2';

export default function Header() {
  const { connected, loading, url, topic, setUrl, setTopic, connect, disconnect } = useMqtt();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Logo / Title */}
        <div className="flex items-center gap-3 mr-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <HiOutlineSignal className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            IoT Fleet Dashboard
          </h1>
        </div>

        {/* MQTT Server Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1">
            <HiOutlineGlobeAlt className="h-3.5 w-3.5" />
            Broker
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={connected}
            placeholder="wss://broker.hivemq.com:8884/mqtt"
            className="flex-1 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
          />
        </div>

        {/* Root Topic Input */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            disabled={connected}
            placeholder="mg_mqtt_dashboard"
            className="flex-1 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
          />
        </div>

        {/* Connect / Disconnect Button */}
        <button
          onClick={connected ? disconnect : connect}
          disabled={loading}
          className={`
            relative flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold shadow-lg transition-all duration-200 
            ${
              connected
                ? 'bg-red-500/90 text-white shadow-red-500/20 hover:bg-red-500 hover:shadow-red-500/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110'
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

        {/* Connection Status Dot */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? 'bg-green-400 animate-pulse-glow' : 'bg-slate-500'
            }`}
          />
          <span className="text-xs text-slate-400">{connected ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
