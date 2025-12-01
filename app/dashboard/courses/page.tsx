'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { BookOpen, Play, CheckCircle2, Circle, ArrowRight, Video, Lock, HelpCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMemo, useEffect } from 'react';
import { logActivity, ActivityType } from '@/lib/activity-logger';

interface Lesson {
  id: string;
  title: string;
  description: string;
  sessionNumber: number;
  courseMaterial: {
    id: string;
    language: string;
    title: string;
  };
  videos: Array<{
    id: string;
  }>;
  quizzes?: Array<{
    id: string;
  }>;
}

interface LessonWithStatus {
  lesson: Lesson;
  isUnlocked: boolean;
  progress: number;
  isCompleted: boolean;
}

interface QuizAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  quizId: string;
}

export default function CoursesPage() {
  const { data: lessonsWithStatus, isLoading } = useQuery<LessonWithStatus[]>({
    queryKey: ['lessonsWithUnlockStatus'],
    queryFn: async () => {
      const response = await apiClient.get('/api/progress/lessons/unlock-status');
      return response.data;
    },
  });

  const lessonIds = useMemo(() => {
    return lessonsWithStatus?.map(item => item.lesson.id) || [];
  }, [lessonsWithStatus]);

  const { data: quizAttemptsMap } = useQuery<Record<string, QuizAttempt[]>>({
    queryKey: ['quizAttemptsForLessons', lessonIds],
    queryFn: async () => {
      if (lessonIds.length === 0) return {};

      const attemptsPromises = lessonIds.map(async (lessonId) => {
        try {
          const response = await apiClient.get(`/api/quiz-attempts/lesson/${lessonId}`);
          return { lessonId, attempts: response.data || [] };
        } catch (error) {
          return { lessonId, attempts: [] };
        }
      });

      const results = await Promise.all(attemptsPromises);
      return results.reduce((acc, { lessonId, attempts }) => {
        acc[lessonId] = attempts;
        return acc;
      }, {} as Record<string, QuizAttempt[]>);
    },
    enabled: lessonIds.length > 0,
  });

  const groupedByLanguage = lessonsWithStatus?.reduce((acc, item) => {
    const lang = item.lesson.courseMaterial.language;
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(item);
    return acc;
  }, {} as Record<string, LessonWithStatus[]>) || {};

  const languageLabels: Record<string, string> = {
    java: 'Java',
    python: 'Python',
    php: 'PHP',
    csharp: 'C#',
  };

  useEffect(() => {
    // Log course access activity
    logActivity({
      activityType: ActivityType.COURSE_ACCESSED,
      action: 'Accessed courses page',
      description: 'Student navigated to view available lessons'
    });
  }, []);

  const handleLockedClick = (sessionNumber: number) => {
    toast.error('Lesson Locked', {
      description: `Please complete Session ${sessionNumber - 1} first before accessing this lesson.`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Lessons</h1>
          <p className="text-slate-400 mt-1">Access lessons, slides, and videos for all courses</p>
        </div>
        <div className="text-center text-slate-400 py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Lessons</h1>
        <p className="text-slate-400 mt-1 text-sm sm:text-base">Pass the quiz (100%) or exhaust all attempts to unlock the next session</p>
      </div>

      {Object.keys(groupedByLanguage).length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">No lessons available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByLanguage).map(([language, langLessons]) => (
            <div key={language} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white capitalize">
                {languageLabels[language] || language} OOP
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {langLessons
                  .sort((a, b) => a.lesson.sessionNumber - b.lesson.sessionNumber)
                  .map((item) => {
                    const { lesson, isUnlocked, progress, isCompleted } = item;
                    const attempts = quizAttemptsMap?.[lesson.id] || [];
                    const hasQuiz = lesson.quizzes && lesson.quizzes.length > 0;
                    const failedAttempts = attempts.filter(a => a.status === 'failed');
                    const passedAttempts = attempts.filter(a => a.status === 'passed');
                    const totalAttempts = attempts.length;
                    const isQuizFailed = hasQuiz && totalAttempts >= 3 && passedAttempts.length === 0;

                    if (isUnlocked) {
                      return (
                        <Link key={lesson.id} href={`/dashboard/lessons/${lesson.id}`}>
                          <Card className={`border-slate-800 bg-slate-900/80 backdrop-blur-xl hover:bg-slate-900 transition-colors cursor-pointer h-full ${isQuizFailed ? 'border-red-500/50' : ''}`}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-white text-lg">{lesson.title}</CardTitle>
                                  <CardDescription className="text-slate-400 mt-1 text-sm">
                                    {lesson.description || `Session ${lesson.sessionNumber}`}
                                  </CardDescription>
                                </div>
                                {isCompleted && !isQuizFailed && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                )}
                                {isQuizFailed && (
                                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>Slide</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  <span>{lesson.videos?.length || 0} videos</span>
                                </div>
                                {hasQuiz && (
                                  <div className="flex items-center gap-1">
                                    <HelpCircle className="h-4 w-4" />
                                    <span>Quiz</span>
                                  </div>
                                )}
                              </div>
                              {hasQuiz && totalAttempts > 0 && (
                                <div className={`p-2 rounded-lg text-xs ${isQuizFailed
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                                    : 'bg-slate-800/50 text-slate-300'
                                  }`}>
                                  {isQuizFailed ? (
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-3 w-3" />
                                      <span className="font-medium">Quiz Failed</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <HelpCircle className="h-3 w-3" />
                                      <span>{totalAttempts}/3 attempts</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                <span className="text-xs text-slate-500">Session {lesson.sessionNumber}</span>
                                <ArrowRight className="h-4 w-4 text-primary" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    } else {
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => handleLockedClick(lesson.sessionNumber)}
                          className="cursor-not-allowed"
                        >
                          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl opacity-60 h-full">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <CardTitle className="text-white text-lg">{lesson.title}</CardTitle>
                                    <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  </div>
                                  <CardDescription className="text-slate-400 mt-1 text-sm">
                                    {lesson.description || `Session ${lesson.sessionNumber}`}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>Slide</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  <span>{lesson.videos?.length || 0} videos</span>
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-xs text-yellow-500 text-center">
                                  Complete Session {lesson.sessionNumber - 1} to unlock
                                </p>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                <span className="text-xs text-slate-600">Session {lesson.sessionNumber}</span>
                                <Lock className="h-4 w-4 text-slate-600" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    }
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
