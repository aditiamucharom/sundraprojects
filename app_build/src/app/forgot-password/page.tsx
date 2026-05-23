'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/authService';
import { CheckSquare, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: resetError } = await authService.resetPassword(email);
      if (resetError) {
        setError(resetError.message || 'Failed to send password reset email.');
      } else {
        setSuccess(true);
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
          Reset password
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          We will send you instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 border border-border-custom sm:rounded-2xl sm:px-10 shadow-custom-md">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-apple-red/10 border border-apple-red/20 text-sm text-apple-red text-center">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <div className="p-4 rounded-xl bg-apple-green/10 border border-apple-green/20 text-sm text-apple-green font-medium">
                Reset instructions have been sent to your email address!
              </div>
              <p className="text-xs text-text-secondary">
                (For Local-First mode, the email send was simulated successfully. Check console logs.)
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-sm font-semibold text-apple-blue hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-apple-blue hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending instructions...' : 'Send reset instructions'}
                </button>
              </div>

              <div className="flex items-center justify-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center text-sm font-semibold text-apple-blue hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
