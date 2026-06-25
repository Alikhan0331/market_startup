'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { campaignsApi, CampaignGoal, DealFormat } from '../../../../lib/api/campaigns';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { buttonVariants } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';
import { ArrowLeft } from 'lucide-react';

const GOALS: { value: CampaignGoal; label: string; desc: string }[] = [
  { value: 'REACH',     label: 'Reach',     desc: 'Maximise audience size' },
  { value: 'SALES',     label: 'Sales',     desc: 'Drive conversions & purchases' },
  { value: 'AWARENESS', label: 'Awareness', desc: 'Build brand recognition' },
];

const FORMATS: { value: DealFormat; label: string }[] = [
  { value: 'STORY',       label: 'Story' },
  { value: 'REEL',        label: 'Reel' },
  { value: 'POST',        label: 'Post' },
  { value: 'VIDEO',       label: 'Video' },
  { value: 'INTEGRATION', label: 'Integration' },
];

const schema = z.object({
  title:       z.string().min(3, 'Min 3 characters'),
  description: z.string().optional(),
  goal:        z.enum(['REACH', 'SALES', 'AWARENESS']),
  budget:      z.string().min(1, 'Required').transform((v) => Number(v)),
  geo:         z.string().optional(),
  deadline:    z.string().min(1, 'Required'),
  format:      z.enum(['STORY', 'REEL', 'POST', 'VIDEO', 'INTEGRATION']),
  isPublic:    z.boolean().optional(),
});

type Form = z.infer<typeof schema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken as string;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<
    z.input<typeof schema>,    // тип для полей формы (string)
    any,
    z.output<typeof schema>   // тип после transform (number)
  >({
    resolver: zodResolver(schema),
    defaultValues: { goal: 'REACH', format: 'REEL', isPublic: false },
  });

  const goal = watch('goal');
  const format = watch('format');

  const create = useMutation({
    mutationFn: (data: Form) => campaignsApi.create(data as any, token),
    onSuccess: (campaign) => {
      toast.success('Campaign created');
      router.push(`/campaigns/${campaign.id}`);
    },
    onError: () => toast.error('Failed to create campaign'),
  });

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-zinc-400')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold text-zinc-100">New campaign</h1>
      </div>

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">

        <div className="space-y-1.5">
          <Label className="text-zinc-300">Title</Label>
          <Input placeholder="e.g. Summer collection launch" className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500" {...register('title')} />
          {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300">Description <span className="text-zinc-600">(optional)</span></Label>
          <Textarea placeholder="What do you want to promote?" className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 resize-none" rows={3} {...register('description')} />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Goal</Label>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setValue('goal', g.value)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  goal === g.value
                    ? 'border-[#4F6EF7] bg-[#4F6EF7]/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
                )}
              >
                <p className={`text-sm font-medium ${goal === g.value ? 'text-[#7B93FA]' : 'text-zinc-200'}`}>{g.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Budget ($)</Label>
            <Input type="number" min={1} placeholder="5000" className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500" {...register('budget')} />
            {errors.budget && <p className="text-xs text-red-400">{errors.budget.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Target geo <span className="text-zinc-600">(optional)</span></Label>
            <Input placeholder="e.g. United States" className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500" {...register('geo')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-300">Deadline</Label>
          <Input type="date" className="border-zinc-700 bg-zinc-800 text-zinc-100" {...register('deadline')} />
          {errors.deadline && <p className="text-xs text-red-400">{errors.deadline.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Content format</Label>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setValue('format', f.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm transition-colors',
                  format === f.value
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 rounded accent-[#4F6EF7]" {...register('isPublic')} />
          <span className="text-sm text-zinc-300">Make public — influencers can see and apply</span>
        </label>

        <button
          type="submit"
          disabled={create.isPending}
          className={cn(buttonVariants(), 'w-full bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white')}
        >
          {create.isPending ? 'Creating...' : 'Create campaign'}
        </button>
      </form>
    </div>
  );
}
