'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { getUserEmail, getUserStatus } from '@/lib/utils/auth';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    let pendingEmail = sessionStorage.getItem('pendingEmail');

    if (!pendingEmail && token) {
      const emailFromToken = getUserEmail();
      if (emailFromToken) {
        pendingEmail = emailFromToken;
        sessionStorage.setItem('pendingEmail', emailFromToken);
      }
    }

    if (pendingEmail) {
      setEmail(pendingEmail);
    } else {
      const saved = sessionStorage.getItem('onboardingData');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.email) {
            setEmail(data.email);
            sessionStorage.setItem('pendingEmail', data.email);
          } else {
            router.push('/onboarding');
          }
        } catch (error) {
          router.push('/onboarding');
        }
      } else {
        router.push('/onboarding');
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token) {
      const status = getUserStatus();
      if (status === 'approved') {
        sessionStorage.removeItem('pendingEmail');
        router.push('/dashboard');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    if (!email) return;

    let interval: NodeJS.Timeout;
    let timeInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const encodedEmail = encodeURIComponent(email);
        const response = await apiClient.get(`/api/auth/status/${encodedEmail}`);
        const newStatus = response.data.status;

        if (newStatus) {
          setStatus((prevStatus) => {
            if (prevStatus !== newStatus) {
              if (response.data.rejectionReason) {
                setRejectionReason(response.data.rejectionReason);
              }

              if (newStatus === 'approved') {
                setTimeout(() => {
                  clearInterval(interval);
                  clearInterval(timeInterval);
                  sessionStorage.removeItem('pendingEmail');
                  localStorage.removeItem('token');
                  router.push('/login');
                }, 2000);
              }
            }
            return newStatus;
          });
        }
      } catch (error: any) {
      }
    };

    checkStatus();
    interval = setInterval(() => {
      checkStatus();
    }, 3000);

    timeInterval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime >= 120) {
          setShowRefreshButton(true);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [email, router]);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Account Approved!</CardTitle>
            <CardDescription className="text-slate-300">
              Your account has been approved. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                sessionStorage.removeItem('pendingEmail');
                router.push('/login');
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Account Rejected</CardTitle>
            <CardDescription className="text-slate-300">
              {rejectionReason || 'Your account registration has been rejected.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/onboarding')}
              variant="outline"
              className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Pending Approval</CardTitle>
          <CardDescription className="text-slate-300">
            Your registration is under review. We'll notify you once an admin reviews your application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
            <p className="text-sm text-slate-300 text-center">
              Please wait while we review your information. This page will automatically update when your status changes.
            </p>
          </div>

          {showRefreshButton && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-slate-300 text-center mb-3">
                If you've been waiting for a while, try refreshing the page to check for updates.
              </p>
              <Button
                onClick={handleRefresh}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
