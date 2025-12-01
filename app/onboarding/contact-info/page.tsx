'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, ArrowRight, Phone, GraduationCap, BookOpen, Calendar } from 'lucide-react';

const contactInfoSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  studentId: z.string().min(3, 'Student ID must be at least 3 characters'),
  program: z.string().optional(),
  yearOfStudy: z.string().optional(),
});

type ContactInfoForm = z.infer<typeof contactInfoSchema>;

export default function ContactInfoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactInfoForm>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: (() => {
      if (typeof window === 'undefined') return {};
      const saved = sessionStorage.getItem('onboardingData');
      return saved ? JSON.parse(saved) : {};
    })(),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('onboardingData');
    if (!saved) {
      router.push('/onboarding/basic-info');
    }
  }, [router]);

  const onSubmit = async (data: ContactInfoForm) => {
    setIsSubmitting(true);
    const saved = JSON.parse(sessionStorage.getItem('onboardingData') || '{}');
    const formData = { ...saved, ...data, step: 'contact' };
    sessionStorage.setItem('onboardingData', JSON.stringify(formData));
    setTimeout(() => {
      router.push('/onboarding/password');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <ProgressIndicator
          currentStep={2}
          totalSteps={4}
          stepLabels={['Basic Info', 'Contact', 'Password', 'Review']}
        />

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">Student Information</CardTitle>
                <CardDescription className="text-slate-400 text-base mt-1">
                  Tell us about your academic details
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number <span className="text-primary">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register('phoneNumber')}
                  className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all"
                  placeholder="024 456 6789"
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student ID <span className="text-primary">*</span>
                </Label>
                <Input
                  id="studentId"
                  {...register('studentId')}
                  className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all"
                  placeholder="11252709"
                />
                {errors.studentId && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.studentId.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="program" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Program/Major
                  </Label>
                  <Input
                    id="program"
                    {...register('program')}
                    className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all"
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearOfStudy" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Year of Study
                  </Label>
                  <Select
                    id="yearOfStudy"
                    {...register('yearOfStudy')}
                    className="bg-slate-800/50 border-slate-700 text-white h-12 text-base focus:border-primary focus:ring-primary transition-all"
                  >
                    <option value="" className="bg-slate-800">Select year</option>
                    <option value="100" className="bg-slate-800">Level 100</option>
                    <option value="200" className="bg-slate-800">Level 200</option>
                    <option value="300" className="bg-slate-800">Level 300</option>
                    <option value="400" className="bg-slate-800">Level 400</option>
                  </Select>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
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
