'use client';

import { useMqtt, Device } from '@/lib/mqtt-context';
import { HiOutlineCpuChip, HiMagnifyingGlass } from 'react-icons/hi2';
import { useState } from 'react';

interface SidebarProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function Sidebar({ selectedId, onSelect }: SidebarProps) {
  const { devices, connected } = useMqtt();
  const [search, setSearch] = useState('');

  const filtered = devices.filter(d =>
    d.id.toLowerCase().includes(search.toLowerCase()),
  );

  const onlineCount = devices.filter(d => d.online).length;

  return (
    <aside className="flex w-72 flex-col border-r border-slate-700/50 bg-slate-900/50">
      {/* Sidebar Header */}
      <div className="border-b border-slate-700/40 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Devices
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">{onlineCount} online</span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs text-slate-500">{devices.length} total</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search devices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700/50 bg-slate-800/40 py-2 pl-9 pr-3 text-sm text-slate-300 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {!connected && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HiOutlineCpuChip className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">Chưa kết nối</p>
            <p className="text-xs text-slate-600 mt-1">Nhấn Connect để bắt đầu</p>
          </div>
        )}
        {connected && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HiOutlineCpuChip className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-500">
              {search ? 'Không tìm thấy thiết bị' : 'Đang chờ thiết bị...'}
            </p>
          </div>
        )}
        {filtered.map((d: Device) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`
              group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150
              ${
                selectedId === d.id
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-white'
                  : 'border border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }
            `}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                d.online
                  ? 'bg-green-400 shadow-sm shadow-green-400/50'
                  : 'bg-slate-500'
              }`}
            />
            <span className="flex-1 truncate text-sm font-medium">{d.id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                d.online
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-slate-700/50 text-slate-500'
              }`}
            >
              {d.online ? 'ON' : 'OFF'}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
