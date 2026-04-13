'use client';

import { useMqtt } from '@/lib/mqtt-context';
import { HiOutlineMagnifyingGlass, HiOutlineCpuChip, HiCheck } from 'react-icons/hi2';
import { useState } from 'react';

interface SidebarProps {
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
}

export default function Sidebar({ selectedIds, onSelectChange }: SidebarProps) {
  const { devices, error, loading } = useMqtt();
  const [search, setSearch] = useState('');

  const filteredDevices = devices.filter(d => d.id.toLowerCase().includes(search.toLowerCase()));

  const handleDeviceClick = (id: string, e: React.MouseEvent) => {
    // If clicking directly on the card (not checkbox), just toggle it or select alone via modifier keys?
    // Let's just make clicking the card toggle its selection if we want mobile friendly,
    // or keep it single select if no checkbox checked. For simplicity: toggle selection.
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter(x => x !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDevices.length && filteredDevices.length > 0) {
      onSelectChange([]);
    } else {
      onSelectChange(filteredDevices.map(d => d.id));
    }
  };

  const isAllSelected = filteredDevices.length > 0 && selectedIds.length === filteredDevices.length;

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search devices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 py-2 pl-9 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{filteredDevices.length} Thiết bị</span>
        {filteredDevices.length > 0 && (
          <button 
            onClick={handleSelectAll}
            className="text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && (
          <div className="rounded-lg bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex justify-center p-4">
            <svg className="h-6 w-6 animate-spin text-cyan-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
            </svg>
          </div>
        )}
        {filteredDevices.length === 0 && !loading && !error && (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Không tìm thấy thiết bị nào
          </div>
        )}
        {filteredDevices.map(device => {
          const isSelected = selectedIds.includes(device.id);
          return (
            <div
              key={device.id}
              onClick={e => handleDeviceClick(device.id, e)}
              className={`
                group relative flex cursor-pointer items-center gap-3 rounded-xl p-3 border transition-all duration-200
                ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-500/10 shadow-md shadow-cyan-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }
              `}
            >
              <div 
                className={`
                  flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors
                  ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-cyan-400'}
                `}
              >
                {isSelected && <HiCheck className="h-3.5 w-3.5 text-white" />}
              </div>

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  device.online ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                <HiOutlineCpuChip className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="truncate font-semibold text-sm text-slate-800 dark:text-slate-200">{device.id}</h3>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      device.online ? 'bg-green-500 dark:bg-green-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {device.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
