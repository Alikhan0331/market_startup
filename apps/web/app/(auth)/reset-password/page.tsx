'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { buttonVariants } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { apiClient } from '../../../lib/api/client';

const schema = z.object({
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type Form = z.infer<typeof schema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: Form) {
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: data.newPassword });
      setDone(true);
      toast.success('Password updated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Link expired or invalid');
    }
  }

  if (!token) {
    return (
      <p className="text-center text-sm text-red-400">
        Invalid reset link.{' '}
        <Link href="/forgot-password" className="underline text-[#4F6EF7]">Request a new one</Link>
      </p>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold text-zinc-100">New password</CardTitle>
        <CardDescription className="text-zinc-400">Choose a strong password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">Your password has been updated.</p>
            <Link href="/login" className={cn(buttonVariants(), 'w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}>
              Sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">New password</Label>
              <Input type="password" className="border-zinc-700 bg-zinc-800 text-zinc-100" {...register('newPassword')} />
              {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Confirm password</Label>
              <Input type="password" className="border-zinc-700 bg-zinc-800 text-zinc-100" {...register('confirm')} />
              {errors.confirm && <p className="text-xs text-red-400">{errors.confirm.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(buttonVariants(), 'w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}
            >
              {isSubmitting ? 'Saving...' : 'Set new password'}
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-zinc-400">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
