'use client';

import { useState } from 'react';
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';

interface LoginPageProps {
  onLogin: (user: string, pass: string) => boolean;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (onLogin(username, password)) {
      // Success is handled by parent state
    } else {
      setError('Tài khoản hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 transition-colors dark:bg-slate-950">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-slate-900 dark:shadow-cyan-900/10 sm:flex-row flex-col">
        
        {/* Left Side - Info Panel */}
        <div className="flex flex-1 flex-col justify-between bg-slate-800 p-10 text-white dark:bg-slate-900/80">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              MQTT DASHBOARD
            </p>
          </div>
          
          <div className="my-12">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Mongoose <br /> MQTT OTA
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-slate-300">
              Hệ thống quản lý và cập nhật Firmware từ xa thông qua giao thức MQTT cho các thiết bị STM32.
            </p>
          </div>
          
          <div>
            <p className="text-xs font-medium text-slate-500">
              Fleet Firmware Deployment Dashboard
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-1 flex-col justify-center p-10 sm:p-14">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Đăng nhập để truy cập bảng điều khiển vận hành.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-500">{error}</p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              Sign In <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
            © 2024 THACO Group Control Interface
          </p>
        </div>
      </div>
    </div>
  );
}
