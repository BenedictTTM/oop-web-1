'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, HelpCircle, Lock, AlertCircle, ChevronLeft, ChevronRight, Clock, List } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@/components/ui/drawer';
import { logActivity, ActivityType } from '@/lib/activity-logger';

enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_IN = 'fill_in',
}

interface QuizQuestion {
  id: string;
  question: string;
  codeSnippet?: string | null;
  questionType: QuestionType;
  options: string[];
  correctAnswer: number | number[] | string;
  explanation: string;
  points: number;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  questions: QuizQuestion[];
  lesson?: {
    id: string;
  };
}

interface QuizAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  answers?: Record<string, any>;
  startTime?: string;
  timeRemaining?: number;
  currentQuestionIndex?: number;
  metadata?: {
    questions?: QuizQuestion[];
    totalQuestions?: number;
    timeTaken?: number;
    completedAt?: string;
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatQuestionText(text: string): React.ReactNode {
  const lines = text.split(/\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={`code-${elements.length}`} className="bg-slate-800/80 text-slate-200 p-3 rounded-lg font-mono text-sm my-2 border border-slate-700 overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isCodeLine = trimmed.match(/^[a-zA-Z].*\{|^\s+\w+.*\{|^\s+\}|^\s+[a-zA-Z].*;|^\s+System\.|^\s+(int|double|void|public|static|return|if|else|for|while)\s|^\s+\w+\s*\(|^\s+\w+\s*=\s*\w+/) || (inCodeBlock && trimmed !== '');

    if (isCodeLine) {
      inCodeBlock = true;
      codeLines.push(line);
    } else {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      }
      if (trimmed === '') {
        elements.push(<br key={`br-${index}`} />);
      } else {
        elements.push(
          <span key={`text-${index}`} className="block my-1">
            {line}
          </span>
        );
      }
    }
  });

  flushCodeBlock();

  return <div className="space-y-1">{elements}</div>;
}

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const quizId = params.quizId as string;
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(900);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionsDrawerOpen, setQuestionsDrawerOpen] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedAnswersRef = useRef(selectedAnswers);
  const timeRemainingRef = useRef(900);
  const handleTimeUpRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const { data: canAttempt, isLoading: isLoadingCanAttempt } = useQuery<{ canAttempt: boolean; reason?: string }>({
    queryKey: ['canAttemptQuiz', quizId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/quiz-attempts/quiz/${quizId}/can-attempt`);
      return response.data;
    },
    enabled: !!quizId,
  });

  const { data: existingAttempt } = useQuery<QuizAttempt>({
    queryKey: ['currentAttempt', quizId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/api/quiz-attempts/quiz/${quizId}/current`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!quizId && canAttempt?.canAttempt !== false,
    retry: false,
  });

  const { data: quiz, isLoading: isLoadingQuiz, error } = useQuery<Quiz>({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/quizzes/${quizId}`);
      return response.data;
    },
    enabled: !!quizId && canAttempt?.canAttempt !== false,
  });

  const createAttemptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/quiz-attempts', { quizId });
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentAttempt(data);
      const initialTime = data.timeRemaining || 900;
      timeRemainingRef.current = initialTime;
      setTimeRemaining(initialTime);
      setCurrentQuestionIndex(data.currentQuestionIndex || 0);
      if (data.answers) {
        setSelectedAnswers(data.answers);
      }
      if (data.metadata?.questions) {
        setCurrentQuestionIndex(0);
      }

      // Log quiz started activity
      logActivity({
        activityType: ActivityType.QUIZ_STARTED,
        action: 'Started a quiz',
        title: quiz?.title,
        description: `Quiz attempt ${data.attemptNumber} started`,
        metadata: {
          quizId: quizId,
          attemptId: data.id,
          attemptNumber: data.attemptNumber
        }
      });

      if (data.status === 'in_progress') {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const interval = setInterval(() => {
          timeRemainingRef.current = timeRemainingRef.current - 1;
          const newTime = timeRemainingRef.current;
          setTimeRemaining(newTime);

          if (newTime <= 0) {
            clearInterval(interval);
            timerIntervalRef.current = null;
            setTimeRemaining(0);
            if (handleTimeUpRef.current) {
              handleTimeUpRef.current();
            }
          }
        }, 1000);

        timerIntervalRef.current = interval;
      }
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { answers: Record<string, any>; currentQuestionIndex: number; timeRemaining: number }) => {
      if (!currentAttempt) throw new Error('No attempt in progress');
      const response = await apiClient.put(`/api/quiz-attempts/${currentAttempt.id}/progress`, data);
      return response.data;
    },
  });

  const submitAttemptMutation = useMutation({
    mutationFn: async (answers: Record<string, any>) => {
      if (!currentAttempt) throw new Error('No attempt in progress');
      const response = await apiClient.post(`/api/quiz-attempts/${currentAttempt.id}/submit`, {
        attemptId: currentAttempt.id,
        answers,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // Log quiz completed activity
      logActivity({
        activityType: ActivityType.QUIZ_COMPLETED,
        action: 'Completed a quiz',
        title: quiz?.title,
        description: `Scored ${data.score}% (${data.passed ? 'Passed' : 'Failed'})`,
        score: data.score,
        metadata: {
          quizId: quizId,
          attemptId: currentAttempt?.id,
          passed: data.passed,
          correctAnswers: data.correctAnswers,
          totalQuestions: data.totalQuestions
        }
      });

      if (data.passed) {
        toast.success(`Congratulations! You passed with ${data.score}%`);
        setTimeout(() => {
          if (quiz?.lesson?.id) {
            router.push(`/dashboard/lessons/${quiz.lesson.id}`);
          } else {
            router.push('/dashboard/courses');
          }
        }, 2000);
      } else {
        toast.error(`You scored ${data.score}%. You need 100% to pass. Please review the lesson materials and try again.`);
        setTimeout(() => {
          if (quiz?.lesson?.id) {
            router.push(`/dashboard/lessons/${quiz.lesson.id}`);
          } else {
            router.push('/dashboard/courses');
          }
        }, 2000);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit quiz');
      setTimeout(() => {
        if (quiz?.lesson?.id) {
          router.push(`/dashboard/lessons/${quiz.lesson.id}`);
        } else {
          router.push('/dashboard/courses');
        }
      }, 2000);
    },
  });

  const startTimer = useCallback((initialTime: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    timeRemainingRef.current = initialTime;
    setTimeRemaining(initialTime);

    const tick = () => {
      const current = timeRemainingRef.current;
      if (current > 0) {
        const newTime = current - 1;
        timeRemainingRef.current = newTime;
        setTimeRemaining(newTime);
      } else {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setTimeRemaining(0);
        if (handleTimeUpRef.current) {
          handleTimeUpRef.current();
        }
      }
    };

    timerIntervalRef.current = setInterval(tick, 1000);
  }, []);

  const handleTimeUp = useCallback(async () => {
    if (!currentAttempt || !quiz || isSubmitting) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    toast.error('Time is up! Submitting your quiz with current answers...');

    const attemptQuestions = currentAttempt?.metadata?.questions || [];
    const questions = attemptQuestions.length > 0
      ? [...attemptQuestions].sort((a, b) => a.order - b.order)
      : (quiz?.questions ? [...quiz.questions].sort((a, b) => a.order - b.order) : []);

    const allAnswers: Record<string, any> = {};
    questions.forEach((question) => {
      if (selectedAnswersRef.current[question.id] !== undefined) {
        allAnswers[question.id] = selectedAnswersRef.current[question.id];
      }
    });

    setIsSubmitting(true);
    setTimeRemaining(0);
    submitAttemptMutation.mutate(allAnswers);
  }, [currentAttempt, quiz, isSubmitting, submitAttemptMutation]);

  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  const saveProgress = () => {
    if (!currentAttempt || !quiz) return;

    if (saveProgressTimeoutRef.current) {
      clearTimeout(saveProgressTimeoutRef.current);
    }

    saveProgressTimeoutRef.current = setTimeout(() => {
      updateProgressMutation.mutate({
        answers: selectedAnswers,
        currentQuestionIndex,
        timeRemaining,
      });
    }, 1000);
  };

  useEffect(() => {
    if (canAttempt?.canAttempt && quiz && !currentAttempt && !createAttemptMutation.isPending && !existingAttempt) {
      createAttemptMutation.mutate();
    }
  }, [canAttempt?.canAttempt, quiz?.id, currentAttempt?.id, createAttemptMutation.isPending, existingAttempt?.id]);

  useEffect(() => {
    if (currentAttempt && currentAttempt.status === 'in_progress' && !timerIntervalRef.current) {
      const initialTime = currentAttempt.timeRemaining || 900;
      timeRemainingRef.current = initialTime;
      setTimeRemaining(initialTime);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const interval = setInterval(() => {
        timeRemainingRef.current = timeRemainingRef.current - 1;
        const newTime = timeRemainingRef.current;
        setTimeRemaining(newTime);

        if (newTime <= 0) {
          clearInterval(interval);
          timerIntervalRef.current = null;
          setTimeRemaining(0);
          if (handleTimeUpRef.current) {
            handleTimeUpRef.current();
          }
        }
      }, 1000);

      timerIntervalRef.current = interval;

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    }
  }, [currentAttempt?.id]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  useEffect(() => {
    if (currentAttempt && currentAttempt.status === 'in_progress' && timerIntervalRef.current) {
      saveProgress();
    }

    return () => {
      if (saveProgressTimeoutRef.current) {
        clearTimeout(saveProgressTimeoutRef.current);
      }
    };
  }, [selectedAnswers, currentQuestionIndex, currentAttempt]);

  useEffect(() => {
    const attemptQuestions = currentAttempt?.metadata?.questions || existingAttempt?.metadata?.questions || [];
    const questions = attemptQuestions.length > 0
      ? [...attemptQuestions].sort((a: any, b: any) => a.order - b.order)
      : (quiz?.questions ? [...quiz.questions].sort((a: any, b: any) => a.order - b.order) : []);

    const handleVisibilityChange = () => {
      if (document.hidden && currentAttempt && !isSubmitting) {
        const allAnswers: Record<string, any> = {};
        questions.forEach((question: any) => {
          if (selectedAnswersRef.current[question.id] !== undefined) {
            allAnswers[question.id] = selectedAnswersRef.current[question.id];
          }
        });

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        submitAttemptMutation.mutate(allAnswers);
      }
    };

    const handleBeforeUnload = () => {
      if (currentAttempt && !isSubmitting) {
        const allAnswers: Record<string, any> = {};
        questions.forEach((question: any) => {
          if (selectedAnswersRef.current[question.id] !== undefined) {
            allAnswers[question.id] = selectedAnswersRef.current[question.id];
          }
        });

        try {
          const token = localStorage.getItem('token');
          if (token && currentAttempt.id) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/quiz-attempts/${currentAttempt.id}/submit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                attemptId: currentAttempt.id,
                answers: allAnswers,
              }),
              keepalive: true,
            });
          }
        } catch (error) {
          console.error('Failed to submit quiz on page unload:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentAttempt?.id, existingAttempt?.id, isSubmitting, quiz?.id, submitAttemptMutation]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (saveProgressTimeoutRef.current) {
        clearTimeout(saveProgressTimeoutRef.current);
      }
    };
  }, []);

  const attemptQuestions = currentAttempt?.metadata?.questions || existingAttempt?.metadata?.questions || [];
  const sortedQuestions = attemptQuestions.length > 0
    ? [...attemptQuestions].sort((a, b) => a.order - b.order)
    : (quiz?.questions ? [...quiz.questions].sort((a, b) => a.order - b.order) : []);
  const currentQuestion = sortedQuestions[currentQuestionIndex];

  const handleAnswerSelect = (questionId: string, answer: any) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleMultipleChoiceToggle = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      const answers = Array.isArray(current) ? [...current] : [];

      if (answers.includes(optionIndex)) {
        return {
          ...prev,
          [questionId]: answers.filter((a) => a !== optionIndex),
        };
      } else {
        return {
          ...prev,
          [questionId]: [...answers, optionIndex],
        };
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (sortedQuestions.length === 0) {
      toast.error('No questions available');
      return;
    }

    if (Object.keys(selectedAnswers).length < sortedQuestions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    if (!currentAttempt) {
      toast.error('No attempt in progress');
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    setIsSubmitting(true);
    submitAttemptMutation.mutate(selectedAnswers);
  };

  if (isLoadingCanAttempt || isLoadingQuiz) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading quiz...</div>
      </div>
    );
  }

  if (canAttempt && !canAttempt.canAttempt) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Quiz Unavailable</h2>
              <p className="text-slate-300 mb-6">{canAttempt.reason}</p>
              <Link href="/dashboard/courses">
                <Button className="bg-primary hover:bg-primary/90">Back to Courses</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Quiz Not Found</h2>
              <p className="text-slate-300 mb-6">The quiz you're looking for doesn't exist or has been removed.</p>
              <Link href="/dashboard/courses">
                <Button className="bg-primary hover:bg-primary/90">Back to Courses</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">Loading question...</div>
      </div>
    );
  }

  const selectedAnswer = selectedAnswers[currentQuestion.id];
  const isLastQuestion = currentQuestionIndex === sortedQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = sortedQuestions.length;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link href="/dashboard/courses">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white mb-4 sm:mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Courses</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-slate-400 text-sm sm:text-lg">{quiz.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 bg-slate-900 px-3 sm:px-4 py-2 rounded-lg border border-slate-700">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className={`text-xl sm:text-2xl font-bold ${timeRemaining <= 60 ? 'text-red-500' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
              <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
              <span className="hidden sm:inline">•</span>
              <span>{answeredCount} answered</span>
              {currentAttempt && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span>Attempt: {currentAttempt.attemptNumber} of 3</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-white text-lg sm:text-xl">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </CardTitle>
            {currentQuestion.codeSnippet && (
              <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                <pre className="bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
                  <code>{currentQuestion.codeSnippet}</code>
                </pre>
              </div>
            )}
            <div className="text-slate-300 text-sm sm:text-base mt-2">
              {formatQuestionText(currentQuestion.question)}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {currentQuestion.questionType === QuestionType.SINGLE_CHOICE && (
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswer === optionIndex;
                  return (
                    <button
                      key={optionIndex}
                      onClick={() => handleAnswerSelect(currentQuestion.id, optionIndex)}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-slate-600'
                          }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-white flex-1 text-sm sm:text-base">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.questionType === QuestionType.MULTIPLE_CHOICE && (
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const isSelected = Array.isArray(selectedAnswer) && selectedAnswer.includes(optionIndex);
                  return (
                    <button
                      key={optionIndex}
                      onClick={() => handleMultipleChoiceToggle(currentQuestion.id, optionIndex)}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ${isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-slate-600'
                          }`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white" />
                          )}
                        </div>
                        <span className="text-white flex-1 text-sm sm:text-base">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.questionType === QuestionType.FILL_IN && (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={selectedAnswer || ''}
                  onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                  placeholder="Type your answer here"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-base sm:text-lg py-4 sm:py-6"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={() => setQuestionsDrawerOpen(true)}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full sm:w-auto"
          >
            <List className="h-4 w-4 mr-2" />
            View All Questions
          </Button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
              disabled={isSubmitting || submitAttemptMutation.isPending || answeredCount < totalQuestions}
            >
              {isSubmitting || submitAttemptMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <Drawer open={questionsDrawerOpen} onClose={() => setQuestionsDrawerOpen(false)} side="right">
        <DrawerContent>
          <DrawerHeader onClose={() => setQuestionsDrawerOpen(false)}>
            <h2 className="text-xl font-bold text-white">All Questions</h2>
          </DrawerHeader>
          <DrawerBody className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sortedQuestions.map((question, index) => {
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = selectedAnswers[question.id] !== undefined;
                return (
                  <button
                    key={question.id}
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      setQuestionsDrawerOpen(false);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${isCurrent
                        ? 'border-primary bg-primary text-white'
                        : isAnswered
                          ? 'border-green-500 bg-green-500/20 text-green-500'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    <div className="text-lg font-bold">{index + 1}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {isAnswered ? 'Answered' : 'Not answered'}
                    </div>
                  </button>
                );
              })}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
