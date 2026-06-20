'use client';

import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { dealsApi } from '../../../../lib/api/deals';
import { Button, buttonVariants } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { cn } from '../../../../lib/utils';

const schema = z.object({
    budget: z.number().min(1, 'Budget must be at least $1'),
    format: z.enum(['STORY', 'REEL', 'POST', 'VIDEO', 'INTEGRATION']),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    deadline: z.string().min(1, 'Deadline required'),
});

type FormData = z.infer<typeof schema>;

const FORMATS = ['STORY', 'REEL', 'POST', 'VIDEO', 'INTEGRATION'] as const;

// Возвращает дату в формате YYYY-MM-DD
function getDateStr(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
}

const DEADLINE_PRESETS = [
    { label: 'Tomorrow', days: 1 },
    { label: 'Week',     days: 7 },
    { label: 'Month',    days: 30 },
] as const;

function NewDealPageContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const influencerId = searchParams.get('influencerId') ?? '';
    const token = (session?.user as any)?.accessToken as string;

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { format: 'POST', budget: 0 },
    });

    const format = watch('format');
    const deadline = watch('deadline');

    const mutation = useMutation({
        mutationFn: (data: FormData) =>
            dealsApi.create(
                {
                    influencerId,
                    budget: data.budget * 100,
                    format: data.format,
                    description: data.description,
                    deadline: data.deadline,
                },
                token,
            ),
        onSuccess: (deal) => {
            toast.success('Deal offer sent!');
            router.push(`/deals/${deal.id}`);
        },
        onError: (err: any) => toast.error(err?.message ?? 'Failed to create deal'),
    });

    if (!influencerId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-lg font-medium text-zinc-300">No influencer selected</p>
                <Link
                    href="/search"
                    className={cn(buttonVariants({ size: 'sm' }), 'mt-4 bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}
                >
                    Browse influencers
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <h1 className="text-lg font-semibold text-zinc-100">Create deal offer</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Send a collaboration proposal</p>
            </div>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
                {/* Content format */}
                <div className="space-y-2">
                    <Label className="text-zinc-300">Content format</Label>
                    <div className="flex flex-wrap gap-2">
                        {FORMATS.map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setValue('format', f)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                    format === f
                                        ? 'bg-[#4F6EF7] text-white'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    {errors.format && <p className="text-xs text-red-400">{errors.format.message}</p>}
                </div>

                {/* Budget */}
                <div className="space-y-2">
                    <Label className="text-zinc-300">Budget (USD)</Label>
                    <Input
                        type="number"
                        min={1}
                        placeholder="500"
                        className="border-zinc-700 bg-zinc-800 text-zinc-100"
                        {...register('budget', { valueAsNumber: true })}
                    />
                    {errors.budget && <p className="text-xs text-red-400">{errors.budget.message}</p>}
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                    <Label className="text-zinc-300">Deadline</Label>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2">
                        {DEADLINE_PRESETS.map(({ label, days }) => {
                            const value = getDateStr(days);
                            const isActive = deadline === value;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setValue('deadline', value, { shouldValidate: true })}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[#4F6EF7] text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <Input
                        type="date"
                        className="border-zinc-700 bg-zinc-800 text-zinc-100"
                        {...register('deadline')}
                    />
                    {errors.deadline && <p className="text-xs text-red-400">{errors.deadline.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-zinc-300">Description</Label>
                    <textarea
                        rows={4}
                        placeholder="Describe the collaboration, deliverables, and requirements..."
                        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] resize-none"
                        {...register('description')}
                    />
                    {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
                </div>

                <Button
                    type="submit"
                    className="w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? 'Sending offer...' : 'Send offer'}
                </Button>
            </form>
        </div>
    );
}

export default function NewDealPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20 text-zinc-400">Loading deal form...</div>}>
            <NewDealPageContent />
        </Suspense>
    );
}