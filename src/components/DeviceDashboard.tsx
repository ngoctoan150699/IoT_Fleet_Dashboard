'use client';

import { useMqtt, Device } from '@/lib/mqtt-context';
import { useState, useRef, useCallback } from 'react';
import {
  HiOutlineLightBulb,
  HiOutlineArrowUpTray,
  HiOutlineCpuChip,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineDocumentText,
  HiOutlineXMark,
} from 'react-icons/hi2';

// ─── Helpers ─────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',', 2)[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Toggle Switch ───────────────────────────────────────────────────
function Toggle({
  value,
  onClick,
  disabled,
}: {
  value: boolean | 'mixed';
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full
        transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed
        ${value === true ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' : value === 'mixed' ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-600'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200
          ${value === true ? 'translate-x-6' : value === 'mixed' ? 'translate-x-3.5' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// ─── LED Control ─────────────────────────────────────────────────────
function LedControl({ devices }: { devices: Device[] }) {
  const { rpc, connected } = useMqtt();
  const [toggling, setToggling] = useState(false);

  const onlineDevices = devices.filter(d => d.online);
  const anyOnline = onlineDevices.length > 0;
  
  // check status
  const allOn = onlineDevices.length > 0 && onlineDevices.every(d => d.led_status);
  const allOff = onlineDevices.length > 0 && onlineDevices.every(d => !d.led_status);
  const mixed = !allOn && !allOff;
  
  const toggleState = allOn ? true : allOff ? false : 'mixed';

  const handleToggle = async () => {
    setToggling(true);
    // Determine new state: if mixed or off -> turn all ON. If all ON -> turn all OFF.
    const turnOn = !allOn;

    try {
      await Promise.all(
        onlineDevices.map(d => rpc(d.id, 'state.set', { led_status: turnOn }))
      );
    } catch (e) {
      console.error('LED toggle failed for some devices:', e);
    }
    setToggling(false);
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineLightBulb
          className={`h-5 w-5 ${allOn || mixed ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}`}
        />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">LED Control</h3>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 px-4 py-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">Toggle LED</span>
        <div className="flex items-center gap-3">
          {toggling && (
            <svg className="h-4 w-4 animate-spin text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
            </svg>
          )}
          <Toggle
            value={toggleState}
            onClick={handleToggle}
            disabled={!anyOnline || !connected || toggling}
          />
        </div>
      </div>
      {devices.length > 1 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          Áp dụng cho {onlineDevices.length} thiết bị đang online.
        </p>
      )}
    </div>
  );
}

// ─── Firmware Update ─────────────────────────────────────────────────
function FirmwareUpdate({ devices }: { devices: Device[] }) {
  const { rpc, connected } = useMqtt();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'mixed_error'>('idle');
  const [targetDeviceId, setTargetDeviceId] = useState<string>('all');

  const onlineDevices = devices.filter(d => d.online);
  const targetOnlineDevices = (targetDeviceId === 'all')
    ? onlineDevices
    : onlineDevices.filter(d => d.id === targetDeviceId);
  const anyOnline = targetOnlineDevices.length > 0;

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setStatus('idle');
      setProgress(0);

      try {
        const buffer = await file.arrayBuffer();
        const chunkSize = 4096;
        const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
        let offset = 0;
        let someFailed = false;

        for (let i = 0; i < totalChunks; i++) {
          const isLastChunk = i === totalChunks - 1;
          const chunk = buffer.slice(i * chunkSize, (i + 1) * chunkSize);
          const encoded = await arrayBufferToBase64(chunk);

          const promises = targetOnlineDevices.map(async (device) => {
            if (isLastChunk) {
              // Fire and forget last chunk for each device
              rpc(device.id, 'ota.upload', {
                offset,
                total: buffer.byteLength,
                chunk: encoded,
              }).catch(() => {
                console.log(`[OTA] Last chunk sent to ${device.id}, may be rebooting...`);
              });
              return true;
            } else {
              try {
                const response = (await rpc(device.id, 'ota.upload', {
                  offset,
                  total: buffer.byteLength,
                  chunk: encoded,
                })) as { result?: string };
                return response.result === 'ok';
              } catch (err) {
                console.warn(`[OTA] Chunk ${i} response issue for ${device.id}:`, err);
                return false;
              }
            }
          });

          const results = await Promise.all(promises);
          if (!isLastChunk && results.some(r => !r)) {
            // some device failed this chunk, but we still continue. We mark mixed_error
            someFailed = true;
          }

          offset += chunk.byteLength;
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        setStatus(someFailed ? 'mixed_error' : 'success');
      } catch (e) {
        console.error('Firmware upload failed completely:', e);
        setStatus('error');
      }

      setUploading(false);
    },
    [targetOnlineDevices, rpc],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus('idle');
      setProgress(0);
    }
    e.target.value = '';
  };

  const onClearFile = () => {
    if (uploading) return;
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
  };

  const onStartUpload = () => {
    if (!selectedFile || uploading) return;
    handleUpload(selectedFile);
  };

  return (
    <div className="glass-card rounded-xl p-5 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineArrowUpTray className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Firmware Update (OTA)</h3>
      </div>

      {/* Target Device Selector when multiple devices present */}
      {devices.length > 1 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            Chọn thiết bị nạp Firmware (Target Device):
          </label>
          <select
            value={targetDeviceId}
            onChange={(e) => setTargetDeviceId(e.target.value)}
            disabled={uploading}
            className="w-full rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer disabled:opacity-50"
          >
            <option value="all">⚡ Tất cả thiết bị online ({onlineDevices.length} thiết bị)</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.online}>
                {d.id} {d.online ? '• Online' : '• Offline'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept=".bin,.hex,.elf"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Step 1: Chưa chọn file */}
      {!selectedFile ? (
        <div className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700/80 px-4 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Chưa chọn file firmware</p>
              <p className="text-[11px] text-slate-400">Định dạng hỗ trợ: .bin, .hex, .elf</p>
            </div>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={!anyOnline || !connected || uploading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <HiOutlineArrowUpTray className="h-4 w-4 text-cyan-500" />
            <span>Chọn file</span>
          </button>
        </div>
      ) : (
        /* Step 2: Đã chọn file -> hiển thị thông tin file & nút bấm "Bắt đầu nạp" */
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <HiOutlineCpuChip className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[180px] sm:max-w-xs" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Dung lượng: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline px-2 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Đổi file
              </button>
              <button
                onClick={onClearFile}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Bỏ chọn file"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nút bấm xác nhận nạp Firmware */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {targetDeviceId === 'all'
                ? `⚡ Sẵn sàng nạp cho ${targetOnlineDevices.length} thiết bị online`
                : `⚡ Sẵn sàng nạp cho thiết bị ${targetDeviceId}`}
            </p>

            <button
              onClick={onStartUpload}
              disabled={!anyOnline || !connected || uploading}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                  </svg>
                  <span>Đang nạp {progress}%</span>
                </>
              ) : (
                <>
                  <HiOutlineArrowUpTray className="h-4 w-4 stroke-[2.5]" />
                  <span>Bắt đầu nạp</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="progress-shine relative h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 text-center">
            Đang upload... {progress}%
          </p>
        </div>
      )}

      {/* Status Messages */}
      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 px-3 py-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300">Upload firmware thành công. Thiết bị đang khởi động lại.</span>
        </div>
      )}
      {status === 'mixed_error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-3 py-2">
          <HiOutlineExclamationCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-700 dark:text-yellow-300">Một số thiết bị gặp lỗi timeout khi upload. Xem chi tiết trong Console.</span>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2">
          <HiOutlineExclamationCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">Lỗi nghiêm trọng. Upload thất bại hoàn toàn.</span>
        </div>
      )}
    </div>
  );
}

// ─── Device Dashboard ────────────────────────────────────────────────
interface DeviceDashboardProps {
  selectedIds: string[];
}

export default function DeviceDashboard({ selectedIds }: DeviceDashboardProps) {
  const { devices } = useMqtt();
  
  const selectedDevices = devices.filter(d => selectedIds.includes(d.id));

  // No device selected
  if (selectedIds.length === 0 || selectedDevices.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 mb-6">
          <HiOutlineCpuChip className="h-10 w-10 text-slate-400 dark:text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Chưa chọn thiết bị</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500 max-w-xs">
          Chọn một hoặc nhiều thiết bị từ danh sách bên trái để thiếp lập và điều khiển.
        </p>
      </div>
    );
  }

  const isMulti = selectedDevices.length > 1;
  const onlineCount = selectedDevices.filter(d => d.online).length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Device / Group Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
              onlineCount > 0
                ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-500/20 dark:to-emerald-500/10 border-green-200 dark:border-green-500/30'
                : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
            }`}
          >
            <HiOutlineCpuChip
              className={`h-7 w-7 ${onlineCount > 0 ? 'text-green-600 dark:text-green-500' : 'text-slate-400 dark:text-slate-500'}`}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {isMulti ? `Nhóm ${selectedDevices.length} thiết bị` : selectedDevices[0].id}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {isMulti ? (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  <strong className="text-green-600 dark:text-green-400">{onlineCount}</strong> online / {selectedDevices.length} tổng
                </span>
              ) : (
                <>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      selectedDevices[0].online ? 'bg-green-500 dark:bg-green-400 animate-pulse-glow' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      selectedDevices[0].online ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-500'
                    }`}
                  >
                    {selectedDevices[0].online ? 'Online' : 'Offline'}
                  </span>
                  
                  {selectedDevices[0].firmware_version && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                        FW: {selectedDevices[0].firmware_version}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panels */}
      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        <LedControl devices={selectedDevices} />
        <FirmwareUpdate devices={selectedDevices} />
      </div>
      
      {/* Selected Devices List (Multi-mode only) */}
      {isMulti && (
        <div className="mt-8 max-w-5xl">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Thiết bị đang chọn</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedDevices.map(d => (
              <div key={d.id} className="glass-card rounded-lg p-3 flex items-center justify-between border-slate-200 dark:border-slate-800 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{d.id}</span>
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${d.online ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} title={d.online ? 'Online' : 'Offline'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
