// app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: process.env.NEXT_PUBLIC_TEST_USER || 'vedant-admin',
      password: process.env.NEXT_PUBLIC_TEST_PASS || 'vedant123',
    },
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setServerError(null);
    try {
      await login(data.userId, data.password);
      toast.success('Successfully logged in!');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Invalid user ID or password';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-white">
      {/* Left panel - Mascot / Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-[#EEF2FF] p-12">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-extrabold text-[#1A1A2E] mb-2 tracking-tight">
            Deploy & Manage Online Tests
          </h2>
          <p className="text-gray-500 font-medium mb-8">
            Preproute Moderator dashboard provides absolute control over chapter tests, mock tests, and questions bank.
          </p>
          
          {/* Mascot SVG */}
          <svg
            className="w-full max-h-[360px]"
            viewBox="0 0 500 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background elements */}
            <circle cx="250" cy="200" r="160" fill="#5B6BF5" fillOpacity="0.08" />
            <rect x="180" y="80" width="140" height="240" rx="20" fill="white" filter="drop-shadow(0px 20px 40px rgba(0, 0, 0, 0.05))" />
            <rect x="195" y="100" width="110" height="150" rx="10" fill="#EEF2FF" />
            
            {/* Mascot details */}
            <circle cx="250" cy="220" r="28" fill="#5B6BF5" />
            <path d="M210 320 C210 270, 290 270, 290 320 Z" fill="#5B6BF5" fillOpacity="0.3" />
            
            {/* Decorative items */}
            <circle cx="120" cy="120" r="12" fill="#10B981" fillOpacity="0.8" />
            <circle cx="380" cy="260" r="18" fill="#EF4444" fillOpacity="0.8" />
            <rect x="360" y="100" width="40" height="8" rx="4" fill="#FBBF24" />
            <rect x="100" y="240" width="30" height="30" rx="6" fill="#5B6BF5" fillOpacity="0.7" transform="rotate(15 100 240)" />
            
            {/* Chart lines on phone screen */}
            <line x1="210" y1="130" x2="290" y2="130" stroke="#5B6BF5" strokeWidth="4" strokeLinecap="round" />
            <line x1="210" y1="150" x2="270" y2="150" stroke="#5B6BF5" strokeWidth="4" strokeLinecap="round" />
            <line x1="210" y1="170" x2="250" y2="170" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
            
            <circle cx="250" cy="285" r="14" fill="#10B981" />
            <path d="M245 285 L249 289 L256 281" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12 md:px-20 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center lg:text-left select-none">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-gray-900">Prep</span>
              <span className="text-[#5B6BF5]">route</span>
            </h1>
          </div>

          {/* Intro Headers */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Login</h2>
            <p className="text-sm font-medium text-gray-400">
              Use your company provided Login credentials.
            </p>
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="text-sm font-medium text-red-800">{serverError}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="User ID"
              placeholder="Enter your user ID"
              error={errors.userId?.message}
              disabled={loading}
              {...register('userId')}
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                isPassword
                placeholder="Enter your password"
                error={errors.password?.message}
                disabled={loading}
                {...register('password')}
              />
              <div className="flex justify-end pt-1">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast('Contact system administrator to reset password.', { icon: 'ℹ️' });
                  }}
                  className="text-xs font-semibold text-[#5B6BF5] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              isLoading={loading}
            >
              Login
            </Button>
          </form>

          {/* Info pill */}
          <div className="mt-8 text-center text-xs font-medium text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-150">
            For evaluation, you can use: <code className="text-[#5B6BF5] font-semibold bg-white border border-gray-200 px-1.5 py-0.5 rounded">vedant-admin</code> / <code className="text-[#5B6BF5] font-semibold bg-white border border-gray-200 px-1.5 py-0.5 rounded">vedant123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
