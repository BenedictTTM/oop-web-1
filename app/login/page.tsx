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
import { apiClient } from '@/lib/api/client';
import { GraduationCap, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getUserStatus, getUserEmail } from '@/lib/utils/auth';
import { logActivity, ActivityType } from '@/lib/activity-logger';

const loginSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const status = getUserStatus();

      if (status === 'approved') {
        router.push('/dashboard');
      } else if (status === 'pending' || status === 'rejected') {
        const email = getUserEmail();
        if (email) {
          sessionStorage.setItem('pendingEmail', email);
        }
        router.push('/onboarding/pending');
      } else {
        localStorage.removeItem('token');
      }
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/auth/login', {
        studentId: data.studentId.trim(),
        password: data.password,
      });

      localStorage.setItem('token', response.data.token);

      const userStatus = response.data.user?.status || 'pending';
      const userEmail = response.data.user?.email;

      if (userStatus === 'approved') {
        // Log login activity
        await logActivity({
          activityType: ActivityType.LOGIN,
          action: 'Logged in to the system',
          description: 'User successfully authenticated'
        });

        toast.success('Login successful!', {
          description: 'Welcome back to your learning journey',
        });
        router.push('/dashboard');
      } else if (userStatus === 'pending') {
        if (userEmail) {
          sessionStorage.setItem('pendingEmail', userEmail);
        }
        toast.info('Account pending approval', {
          description: 'Your account is pending admin approval',
        });
        router.push('/onboarding/pending');
      } else if (userStatus === 'rejected') {
        toast.error('Account rejected', {
          description: 'Your account has been rejected. Please contact admin.',
        });
        if (userEmail) {
          sessionStorage.setItem('pendingEmail', userEmail);
          router.push('/onboarding/pending');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed. Please check your credentials.';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 404) {
        errorMessage = 'Student ID not found';
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid student ID or password';
      } else if (err.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      toast.error('Login failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = () => {
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Sign in to continue your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="studentId" className="text-slate-200 text-sm font-medium">
                Student ID
              </Label>
              <Input
                id="studentId"
                {...register('studentId')}
                className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary"
                placeholder="11252709"
              />
              {errors.studentId && (
                <p className="text-sm text-destructive">{errors.studentId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className="bg-slate-800/50 border-slate-700 text-white h-12 text-base placeholder:text-slate-500 focus:border-primary focus:ring-primary"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-white h-12 font-medium"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-sm text-slate-400 text-center mb-4">
              Don't have an account?
            </p>
            <Button
              type="button"
              onClick={handleSignup}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="absolute bottom-4 text-slate-500 text-sm">
        Built by @Joe Acheampong
      </div>
    </div>
  );
}

