'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Flame, BookOpen, Video, FileText, Target } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface ProgressItem {
  id: string;
  userId: string;
  lessonId?: string | null;
  courseMaterialId?: string | null;
  videoId?: string | null;
  progressType?: string;
  isCompleted?: boolean;
  progressPercentage?: number;
  createdAt?: string;
}

export default function ProgressPage() {
  const { data, isLoading, error } = useQuery<ProgressItem[]>({
    queryKey: ['myProgress'],
    queryFn: async () => {
      const resp = await apiClient.get('/api/progress/me');
      return resp.data || [];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => {
    const items = data || [];
    const total = items.length;
    const videosWatched = items.filter((i) => i.progressType === 'video_watched' && i.isCompleted).length;
    const quizzesCompleted = items.filter((i) => i.progressType === 'quiz_completed' && i.isCompleted).length;
    const avgProgress = total === 0 ? 0 : Math.round((items.reduce((s, i) => s + (i.progressPercentage || 0), 0) / total) || 0);

    // Minimal language breakdown: group by lessonId's presence as a heuristic (this will vary by backend)
    const languageMap: Record<string, { name: string; progress: number; completed: number; total: number }> = {};
    // We don't have language info in the progress response; create a fallback grouping by lessonId
    items.forEach((it) => {
      const key = it.lessonId || 'unknown';
      if (!languageMap[key]) {
        languageMap[key] = { name: key === 'unknown' ? 'General' : `Lesson ${key.slice(0, 6)}`, progress: 0, completed: 0, total: 0 };
      }
      languageMap[key].progress += it.progressPercentage || 0;
      languageMap[key].total += 100;
      if (it.isCompleted) languageMap[key].completed += 1;
    });

    const languages = Object.values(languageMap).map((l) => ({
      name: l.name,
      progress: l.total === 0 ? 0 : Math.round(l.progress / (l.total / 100)),
      completed: l.completed,
      total: Math.max(1, Math.round(l.total / 100)),
    }));

    return {
      overallProgress: avgProgress,
      currentStreak: 0,
      coursesCompleted: 0,
      videosWatched,
      quizzesCompleted,
      languages,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Progress Tracking</h1>
        <p className="text-slate-400 mt-1">Monitor your learning journey and achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Overall Progress</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{isLoading ? '—' : `${stats.overallProgress}%`}</div>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${stats.overallProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Learning Streak</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{isLoading ? '—' : `${stats.currentStreak} days`}</div>
            <p className="text-xs text-slate-400 mt-1">Keep it up!</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Videos Watched</CardTitle>
            <Video className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{isLoading ? '—' : stats.videosWatched}</div>
            <p className="text-xs text-slate-400 mt-1">Total watched</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Quizzes Completed</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{isLoading ? '—' : stats.quizzesCompleted}</div>
            <p className="text-xs text-slate-400 mt-1">Total completed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Progress by Lesson</CardTitle>
          <CardDescription className="text-slate-400">Track your progress grouped by lesson</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400">Loading...</div>
          ) : (
            stats.languages.map((lang) => (
              <div key={lang.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-white font-medium">{lang.name}</span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {lang.completed}/{lang.total} completed
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${lang.progress}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400">{lang.progress}% complete</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

