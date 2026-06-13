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
    <div className="flex min-h-screen w-screen bg-[#F7F8FC]">
      {/* Left panel - Login Illustration (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 justify-center items-center p-12 bg-[#1A1A2E] border-r border-gray-150">
        <div className="max-w-md w-full flex justify-center items-center">
          <img
            src="/login.png"
            alt="Login Illustration"
            className="max-h-[380px] w-auto object-contain"
          />
        </div>
      </div>

      {/* Right panel - Login form card */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center px-6 py-12 sm:px-12 md:px-20">
        <div className="w-full max-w-md bg-white border border-gray-150 rounded-xl p-8 md:p-10 shadow-sm space-y-6">
          {/* Logo */}
          <div className="select-none mb-2">
            <img
              src="/preproute logo.png"
              alt="Preproute"
              className="h-9 w-auto"
            />
          </div>

          {/* Intro Headers */}
          <div className="space-y-1">
            <h2 className="text-xl font-medium text-gray-950">Login</h2>
            <p className="text-xs text-gray-400 font-normal">
              Use your company provided Login credentials.
            </p>
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 p-3.5 border border-red-200">
              <div className="text-xs font-medium text-red-800">{serverError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="User ID"
              placeholder="Enter User ID"
              error={errors.userId?.message}
              disabled={loading}
              {...register('userId')}
            />

            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                isPassword
                placeholder="Enter Password"
                error={errors.password?.message}
                disabled={loading}
                {...register('password')}
              />
              <div className="flex justify-start">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast('Contact system administrator to reset password.', { icon: 'ℹ️' });
                  }}
                  className="text-xs text-[#5B6BF5] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm bg-[#5B6BF5] hover:bg-[#4a5ae4] text-white"
              isLoading={loading}
            >
              Login
            </Button>
          </form>

          {/* Info pill */}
          <div className="text-center text-[11px] text-gray-400 bg-gray-50 rounded-lg p-2.5 border border-gray-150">
            For evaluation, you can use: <code className="text-[#5B6BF5] font-semibold bg-white border border-gray-200 px-1 py-0.5 rounded">vedant-admin</code> / <code className="text-[#5B6BF5] font-semibold bg-white border border-gray-200 px-1 py-0.5 rounded">vedant123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
