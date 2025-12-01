'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicator } from '@/components/onboarding/progress-indicator';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function PasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const password = watch('password', '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('onboardingData');
    if (!saved) {
      router.push('/onboarding/basic-info');
    }
  }, [router]);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: '', color: '' };
    if (pwd.length < 8) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (pwd.length < 12) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: PasswordForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof window === 'undefined') return;
      const saved = JSON.parse(sessionStorage.getItem('onboardingData') || '{}');
      const registrationData = {
        ...saved,
        password: data.password,
        studentId: saved.studentId?.trim(),
        email: saved.email?.trim().toLowerCase(),
      };

      await apiClient.post('/api/auth/register', registrationData);
      sessionStorage.setItem('pendingEmail', registrationData.email);
      sessionStorage.removeItem('onboardingData');
      toast.success('Registration successful!', {
        description: 'Your account is pending admin approval',
      });
      router.push('/onboarding/pending');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error('Registration failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <ProgressIndicator
          currentStep={3}
          totalSteps={4}
          stepLabels={['Basic Info', 'Contact', 'Password', 'Review']}
        />

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-white">Create Password</CardTitle>
                <CardDescription className="text-slate-400 text-base mt-1">
                  Secure your account with a strong password
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm flex items-start gap-2">
                  <span className="mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all pr-12"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 rounded-full transition-all ${level <= passwordStrength.strength
                              ? passwordStrength.color
                              : 'bg-slate-700'
                            }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${passwordStrength.color.replace('bg-', 'text-')}`}>
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary transition-all pr-12"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <span>•</span>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-300 mb-2 font-medium">Password requirements:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className={password.length >= 8 ? 'text-primary' : 'text-slate-600'}>✓</span>
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={password.length >= 12 ? 'text-primary' : 'text-slate-600'}>✓</span>
                    12+ characters for stronger security
                  </li>
                </ul>
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
                      Creating Account...
                    </span>
                  ) : (
                    <>
                      Complete Registration
                      <CheckCircle2 className="w-4 h-4 ml-2" />
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
