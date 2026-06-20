'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { buttonVariants } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { apiClient } from '../../../lib/api/client';

const schema = z.object({ email: z.string().email('Invalid email') });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-zinc-100">Forgot password</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter your email and we&apos;ll send a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              If an account exists for that email, you&apos;ll receive a reset link shortly. Check your inbox.
            </p>
            <Link href="/login" className={cn(buttonVariants(), 'w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300" htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(buttonVariants(), 'w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-zinc-400">
              <Link href="/login" className="text-[#4F6EF7] hover:text-[#7B93FA] underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
