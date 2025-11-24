'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Video, FileText, TrendingUp, Flame, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    coursesCompleted: 0,
    videosWatched: 0,
    quizzesCompleted: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    const pendingEmail = sessionStorage.getItem('pendingEmail');
    if (pendingEmail) {
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Welcome back! Continue your learning journey.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Learning Streak</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.currentStreak} days</div>
            <p className="text-xs text-slate-400 mt-1">Keep it up!</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.coursesCompleted}</div>
            <p className="text-xs text-slate-400 mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Videos</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.videosWatched}</div>
            <p className="text-xs text-slate-400 mt-1">Watched</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Quizzes</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.quizzesCompleted}</div>
            <p className="text-xs text-slate-400 mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-slate-400">Continue where you left off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/courses" className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-white">View Course Materials</span>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/dashboard/videos" className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-primary" />
                <span className="text-white">Watch Videos</span>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </Link>
            <Link href="/dashboard/quizzes" className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-white">Take Quizzes</span>
              </div>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>No recent activity</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
