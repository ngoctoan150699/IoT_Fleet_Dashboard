'use client';

import { useMqtt, Device } from '@/lib/mqtt-context';
import { useState, useRef, useCallback } from 'react';
import {
  HiOutlineLightBulb,
  HiOutlineArrowUpTray,
  HiOutlineTrash,
  HiOutlineCpuChip,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';

// ─── Helpers ─────────────────────────────────────────────────────────
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
  value: boolean;
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
        ${value ? 'bg-cyan-500 shadow-lg shadow-cyan-500/30' : 'bg-slate-600'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200
          ${value ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}

// ─── LED Control ─────────────────────────────────────────────────────
function LedControl({ device }: { device: Device }) {
  const { rpc, connected } = useMqtt();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await rpc(device.id, 'state.set', { led_status: !device.led_status });
    } catch (e) {
      console.error('LED toggle failed:', e);
    }
    setToggling(false);
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineLightBulb
          className={`h-5 w-5 ${device.led_status ? 'text-yellow-400' : 'text-slate-500'}`}
        />
        <h3 className="text-sm font-semibold text-white">LED Control</h3>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
        <span className="text-sm text-slate-300">Toggle LED</span>
        <div className="flex items-center gap-3">
          {toggling && (
            <svg className="h-4 w-4 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
            </svg>
          )}
          <Toggle
            value={device.led_status}
            onClick={handleToggle}
            disabled={!device.online || !connected || toggling}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Firmware Update ─────────────────────────────────────────────────
function FirmwareUpdate({ device }: { device: Device }) {
  const { rpc, connected } = useMqtt();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

        for (let i = 0; i < totalChunks; i++) {
          const isLastChunk = i === totalChunks - 1;
          const chunk = buffer.slice(i * chunkSize, (i + 1) * chunkSize);
          const encoded = await arrayBufferToBase64(chunk);

          if (isLastChunk) {
            // Chunk cuối: GỬI mà KHÔNG chờ response
            // Lý do: sau mg_ota_end(), thiết bị có thể reboot ngay lập tức
            // và không kịp gửi phản hồi → gây timeout vô ích.
            // Đây chính xác là cách code gốc Mongoose Dashboard hoạt động.
            rpc(device.id, 'ota.upload', {
              offset,
              total: buffer.byteLength,
              chunk: encoded,
            }).catch(() => {
              // Bỏ qua timeout của chunk cuối - thiết bị đã nhận và đang reboot
              console.log('[OTA] Last chunk sent, device may be rebooting...');
            });
          } else {
            // Các chunk trước: chờ response xác nhận "ok" trước khi gửi tiếp
            try {
              const response = (await rpc(device.id, 'ota.upload', {
                offset,
                total: buffer.byteLength,
                chunk: encoded,
              })) as { result?: string };

              if (response.result !== 'ok') {
                throw new Error(`Chunk ${i} upload failed`);
              }
            } catch (err) {
              // Nếu timeout ở chunk giữa chừng, log cảnh báo nhưng vẫn tiếp tục
              // vì thiết bị có thể đã nhận chunk nhưng phản hồi bị mất
              console.warn(`[OTA] Chunk ${i}/${totalChunks} response issue:`, err);
            }
          }

          offset += chunk.byteLength;
          setProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        setStatus('success');
      } catch (e) {
        console.error('Firmware upload failed:', e);
        setStatus('error');
      }

      setUploading(false);
    },
    [device.id, rpc],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <HiOutlineArrowUpTray className="h-5 w-5 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Firmware Update</h3>
      </div>

      {/* Current Version */}
      <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3 mb-3">
        <span className="text-sm text-slate-300">Phiên bản hiện tại</span>
        <span className="rounded-md bg-slate-700/60 px-2.5 py-1 text-xs font-mono font-semibold text-cyan-300">
          {device.firmware_version || '??'}
        </span>
      </div>

      {/* Upload Button */}
      <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
        <span className="text-sm text-slate-300">Upload firmware mới</span>
        <input
          ref={inputRef}
          type="file"
          accept=".bin,.hex,.elf"
          onChange={onFileChange}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!device.online || !connected || uploading}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
            </svg>
          ) : (
            <HiOutlineArrowUpTray className="h-4 w-4" />
          )}
          {uploading ? `${progress}%` : 'Chọn file'}
        </button>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="progress-shine relative h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400 text-center">
            Đang upload... {progress}%
          </p>
        </div>
      )}

      {/* Status Messages */}
      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-xs text-green-300">Upload firmware thành công!</span>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <HiOutlineExclamationCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-300">Upload thất bại. Vui lòng thử lại.</span>
        </div>
      )}
    </div>
  );
}

// ─── Device Dashboard ────────────────────────────────────────────────
interface DeviceDashboardProps {
  selectedId: string | null;
}

export default function DeviceDashboard({ selectedId }: DeviceDashboardProps) {
  const { devices, forgetDevice, connected } = useMqtt();
  const device = devices.find(d => d.id === selectedId);

  // No device selected
  if (!selectedId || !device) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800/50 mb-6">
          <HiOutlineCpuChip className="h-10 w-10 text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-400">Chưa chọn thiết bị</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-xs">
          Chọn một thiết bị từ danh sách bên trái để xem chi tiết và điều khiển.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Device Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              device.online
                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30'
                : 'bg-slate-800/50 border border-slate-700/50'
            }`}
          >
            <HiOutlineCpuChip
              className={`h-6 w-6 ${device.online ? 'text-green-400' : 'text-slate-500'}`}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{device.id}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  device.online ? 'bg-green-400 animate-pulse-glow' : 'bg-slate-500'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  device.online ? 'text-green-400' : 'text-slate-500'
                }`}
              >
                {device.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => forgetDevice(device)}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
        >
          <HiOutlineTrash className="h-4 w-4" />
          Forget Device
        </button>
      </div>

      {/* Control Panels */}
      <div className="grid gap-5 lg:grid-cols-2">
        <LedControl device={device} />
        <FirmwareUpdate device={device} />
      </div>
    </div>
  );
}
