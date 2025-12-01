'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';

type CompletedQuiz = {
  attemptId: string;
  quizId: string;
  title: string | null;
  description: string | null;
  language: string | null;
  questionCount: number | null;
  status: string;
  passed: boolean;
  scorePercent: number | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  completedAt: string | null;
  reviewable: boolean;
  metadata: Record<string, any>;
};

export default function QuizzesPage() {
  const [completedQuizzes, setCompletedQuizzes] = useState<CompletedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/api/students/me/completed-quizzes');
        const data = res.data;
        // API returns { user, completed }
        const items: CompletedQuiz[] = Array.isArray(data?.completed) ? data.completed : [];
        if (mounted) setCompletedQuizzes(items);
      } catch (err) {
        console.error('Failed to fetch completed quizzes', err);
        if (mounted) setCompletedQuizzes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => { mounted = false; };
  }, []);

  const handleAction = (quiz: CompletedQuiz) => {
    if (quiz.reviewable) {
      router.push(`/dashboard/quizzes/${quiz.quizId}/review`);
    } else {
      router.push(`/dashboard/quizzes/${quiz.quizId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Quizzes</h1>
        <p className="text-slate-400 mt-1">Test your knowledge after each lesson</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="text-slate-400">Loading quizzes...</div>
        ) : completedQuizzes.length === 0 ? (
          <div className="text-slate-400">No completed quizzes yet.</div>
        ) : (
          completedQuizzes.map((quiz) => (
            <Card key={quiz.attemptId} className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-white text-md md:text-lg truncate">{quiz.title}</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">{quiz.description}</CardDescription>
                  </div>
                  {quiz.passed && (
                    <CheckCircle2 className="h-4 w-6 text-green-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    {quiz.language || '—'}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FileText className="h-4 w-4" />
                    {quiz.questionCount ?? quiz.totalQuestions ?? '—'} questions
                  </div>
                </div>
                {quiz.scorePercent !== null && quiz.scorePercent !== undefined && (
                  <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Your Score</span>
                      <span className="text-lg font-bold text-green-500">{quiz.scorePercent}%</span>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  variant={quiz.reviewable ? 'outline' : 'default'}
                  onClick={() => handleAction(quiz)}
                >
                  {quiz.reviewable ? 'Review Quiz' : 'Start Quiz'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

