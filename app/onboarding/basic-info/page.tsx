'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicator } from '@/components/onboarding/progress-indicator';
import { ArrowLeft, ArrowRight, User, Mail, MapPin } from 'lucide-react';

const basicInfoSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  residentialStatus: z.enum(['resident', 'non_resident'], {
    message: 'Please select residential status',
  }),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export default function BasicInfoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: (() => {
      if (typeof window === 'undefined') return {};
      const saved = sessionStorage.getItem('onboardingData');
      return saved ? JSON.parse(saved) : {};
    })(),
  });

  const onSubmit = async (data: BasicInfoForm) => {
    setIsSubmitting(true);
    const formData = { ...data, step: 'basic' };
    sessionStorage.setItem('onboardingData', JSON.stringify(formData));
    setTimeout(() => {
      router.push('/onboarding/contact-info');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <ProgressIndicator
          currentStep={1}
          totalSteps={4}
          stepLabels={['Basic Info', 'Contact', 'Password', 'Review']}
        />

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">Basic Information</CardTitle>
                <CardDescription className="text-slate-400 text-base mt-1">
                  Let's start with your personal details
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  {...register('fullName')}
                  className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all"
                  placeholder="Joseph Acheampong"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all"
                  placeholder="joe@gmail.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="residentialStatus" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Residential Status
                </Label>
                <Select
                  id="residentialStatus"
                  {...register('residentialStatus')}
                  className="bg-slate-800/50 border-slate-700 text-white h-12 text-base focus:border-primary focus:ring-primary transition-all"
                >
                  <option value="" className="bg-slate-800">Select your status</option>
                  <option value="resident" className="bg-slate-800">Resident</option>
                  <option value="non_resident" className="bg-slate-800">Non-Resident</option>
                </Select>
                {errors.residentialStatus && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.residentialStatus.message}
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/onboarding')}
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 font-medium transition-all shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
