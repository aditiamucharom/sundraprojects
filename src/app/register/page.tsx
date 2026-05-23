'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/authService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { CheckSquare } from 'lucide-react';

export default function RegisterPage() {
  const { refreshUser, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await authService.signUp(email, password, fullName);
      if (signUpError) {
        setError(signUpError.message || 'Failed to sign up.');
      } else {
        // Automatically refresh user context and redirect
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {/* App Logo */}
        <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-apple-blue text-white shadow-custom-md mb-4 bounce-hover">
          <CheckSquare className="h-7 w-7" />
        </div>

        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-apple-blue hover:opacity-80 transition-opacity">
            Sign in
          </Link>
        </p>

        {/* Database Mode Indicator Badge */}
        <div className="mt-3">
          {isSupabaseConfigured ? (
            <span className="inline-flex items-center rounded-full bg-apple-green/10 px-2.5 py-0.5 text-xs font-medium text-apple-green">
              Supabase Mode
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-apple-orange/10 px-2.5 py-0.5 text-xs font-medium text-apple-orange">
              Local-First Mode (LocalStorage)
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border-custom sm:rounded-2xl sm:px-10 shadow-custom-md">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-xl border border-border-custom bg-background/50 px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-border-custom bg-background/50 px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-border-custom bg-background/50 px-4 py-3 text-foreground shadow-sm placeholder-text-secondary focus:border-apple-blue focus:ring-1 focus:ring-apple-blue focus:outline-none transition-all text-sm"
                  placeholder="•••••••• (Min. 6 chars)"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-apple-blue hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
