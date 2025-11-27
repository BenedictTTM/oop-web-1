'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';
import { BookOpen, Play, ExternalLink, FileText, Video, ArrowLeft, Lock, AlertCircle, X, Maximize2, HelpCircle, CheckCircle2, Clock, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logActivity, ActivityType } from '@/lib/activity-logger';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoItemProps {
  video: {
    id: string;
    title: string;
    description: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    order: number;
  };
  onWatch: (videoId: string) => void | Promise<void>;
}

function VideoItemWithProgress({ video, onWatch }: { video: VideoItemProps['video']; onWatch: (videoId: string) => void }) {
  return <VideoItem video={video} onWatch={onWatch} />;
}

function VideoItem({ video, onWatch }: VideoItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMarkedWatched = useRef(false);

  const handleExpand = () => {
    setIsExpanded(true);
    if (!hasMarkedWatched.current && video.id) {
      hasMarkedWatched.current = true;
      try {
        onWatch(video.id);
      } catch (error: any) {
        hasMarkedWatched.current = false;
        console.error('Error marking video as watched:', error);
      }
    }
  };

  return (
    <div className="group">
      {!isExpanded ? (
        <div
          className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden cursor-pointer border border-slate-700 hover:border-primary/50 transition-all"
          onClick={handleExpand}
        >
          <img
            src={`https://img.youtube.com/vi/${video.youtubeVideoId}/maxresdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 group-hover:bg-black/60 transition-colors">
            <div className="bg-primary rounded-full p-4 shadow-lg">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <h4 className="text-white font-semibold text-base mb-1">{video.title}</h4>
            <p className="text-slate-300 text-sm line-clamp-2">{video.description}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-semibold text-lg">{video.title}</h4>
              <p className="text-slate-400 text-sm mt-1">{video.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeVideoId}?rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  sessionNumber: number;
  courseMaterial: {
    id: string;
    title: string;
    fileUrl: string;
    fileName: string;
  };
  videos: Array<{
    id: string;
    title: string;
    description: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    order: number;
  }>;
}

interface LessonProgress {
  slideRead: boolean;
  videosWatched: number;
  totalVideos: number;
  progress: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface QuizAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  timeRemaining?: number;
  createdAt: string;
  metadata?: {
    timeTaken?: number;
    completedAt?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  passingScore: number;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    points: number;
    order: number;
  }>;
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const queryClient = useQueryClient();
  const router = useRouter();
  const [slideExpanded, setSlideExpanded] = useState(false);
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const slideIframeRef = useRef<HTMLIFrameElement>(null);
  const hasMarkedSlideRead = useRef(false);

  const { data: lesson, isLoading: isLoadingLesson, error: lessonError } = useQuery<Lesson>({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/api/lessons/${lessonId}`);

        // Log material viewed activity
        if (response.data) {
          logActivity({
            activityType: ActivityType.MATERIAL_VIEWED,
            action: 'Viewed lesson materials',
            title: response.data.title,
            description: `Accessed Session ${response.data.sessionNumber} - ${response.data.title}`,
            metadata: {
              lessonId: lessonId,
              sessionNumber: response.data.sessionNumber
            }
          });
        }

        return response.data;
      } catch (error: any) {
        if (error.response?.status === 403) {
          throw new Error('LESSON_LOCKED');
        }
        throw error;
      }
    },
  });


  const { data: progress, isLoading: isLoadingProgress } = useQuery<LessonProgress>({
    queryKey: ['lessonProgress', lessonId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/progress/lesson/${lessonId}`);
      return response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    gcTime: 0,
  });

  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuery<Quiz[]>({
    queryKey: ['quizzes', lessonId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/api/quizzes/lesson/${lessonId}`);
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!lessonId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const lessonQuiz = quizzes && quizzes.length > 0 ? quizzes[0] : null;
  const quizId = lessonQuiz?.id || null;

  const { data: quizAttempts } = useQuery<QuizAttempt[]>({
    queryKey: ['quizAttempts', lessonId, quizId],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/api/quiz-attempts/lesson/${lessonId}`);
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!lessonId && !!quizId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const markSlideReadMutation = useMutation({
    mutationFn: async (courseMaterialId: string) => {
      await apiClient.post('/api/progress/slide/read', { courseMaterialId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonProgress', lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lessonsWithUnlockStatus'] });
    },
  });

  const markVideoWatchedMutation = useMutation({
    mutationFn: async (videoId: string) => {
      if (!videoId) {
        throw new Error('Video ID is required');
      }

      try {
        const response = await apiClient.post('/api/progress/video/watched', {
          videoId,
          progressPercentage: 100
        });
        return { videoId, progress: response.data };
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        const status = error.response?.status;

        if (status === 400) {
          if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint') || errorMessage.includes('UQ_') || errorMessage.includes('could not be retrieved')) {
            try {
              const progressResponse = await apiClient.get(`/api/progress/video/${videoId}`);
              return { videoId, progress: progressResponse.data };
            } catch (fetchError) {
              return { videoId, progress: { isCompleted: true } };
            }
          }

          if (errorMessage.includes('Video not found') || errorMessage.includes('User not found')) {
            throw new Error(errorMessage);
          }
        }

        if (status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        }

        throw error;
      }
    },
    onSuccess: (result: any, videoId: string) => {
      const progress = result?.progress || result;

      const progressData = progress && progress.isCompleted !== undefined
        ? { isCompleted: progress.isCompleted, progressPercentage: progress.progressPercentage || 100 }
        : { isCompleted: true, progressPercentage: 100 };

      queryClient.setQueryData(['videoProgress', videoId], progressData);

      setTimeout(async () => {
        try {
          const freshProgress = await apiClient.get(`/api/progress/video/${videoId}`);
          if (freshProgress.data) {
            queryClient.setQueryData(['videoProgress', videoId], {
              isCompleted: freshProgress.data.isCompleted || false,
              progressPercentage: freshProgress.data.progressPercentage,
            });
          }
        } catch (e) {
          queryClient.setQueryData(['videoProgress', videoId], progressData);
        }
        queryClient.invalidateQueries({ queryKey: ['lessonProgress', lessonId] });
        await queryClient.refetchQueries({ queryKey: ['lessonProgress', lessonId] });
      }, 300);
    },
  });

  const handleSlideView = () => {
    setSlideExpanded(true);
    if (!progress?.slideRead && !hasMarkedSlideRead.current && lesson?.courseMaterial?.id) {
      hasMarkedSlideRead.current = true;
      markSlideReadMutation.mutate(lesson.courseMaterial.id);
    }
  };

  const handleSlideModalOpen = (open: boolean) => {
    setSlideModalOpen(open);
    if (open && !progress?.slideRead && !hasMarkedSlideRead.current && lesson?.courseMaterial?.id) {
      hasMarkedSlideRead.current = true;
      markSlideReadMutation.mutate(lesson.courseMaterial.id);
    }
  };

  const handleVideoWatch = (videoId: string) => {
    markVideoWatchedMutation.mutate(videoId);
  };

  const getSlideViewerUrl = (fileUrl: string) => {
    const encodedUrl = encodeURIComponent(fileUrl);
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      return fileUrl;
    }
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  if (isLoadingLesson || isLoadingProgress) {
    return (
      <div className="space-y-6">
        <div className="text-center text-slate-400 py-12">Loading lesson...</div>
      </div>
    );
  }

  if (lessonError && (lessonError as Error).message === 'LESSON_LOCKED') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
        <Card className="border-yellow-500/50 bg-yellow-500/10 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lesson Locked</h2>
            <p className="text-slate-300 mb-4">
              This lesson is locked. You must complete all previous sessions first.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Please finish all slides and videos from previous sessions to unlock this lesson.
            </p>
            <Button
              onClick={() => router.push('/dashboard/courses')}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="space-y-6">
        <div className="text-center text-slate-400 py-12">Lesson not found</div>
      </div>
    );
  }

  if (!isLoadingProgress && progress && !progress.isUnlocked) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        </div>
        <Card className="border-yellow-500/50 bg-yellow-500/10 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lesson Locked</h2>
            <p className="text-slate-300 mb-4">
              You must complete Session {lesson.sessionNumber - 1} before accessing this lesson.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Please finish all slides and videos from the previous session to unlock this lesson.
            </p>
            <Button
              onClick={() => router.push('/dashboard/courses')}
              className="bg-primary hover:bg-primary/90"
            >
              Go to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedVideos = [...(lesson.videos || [])].sort((a, b) => a.order - b.order);

  const handleTakeQuiz = async () => {
    if (!lessonQuiz) {
      toast.error('No quiz available for this lesson');
      return;
    }

    if (!lessonQuiz.id) {
      toast.error('Quiz ID is missing');
      return;
    }

    const quizPath = `/dashboard/quizzes/${lessonQuiz.id}`;
    router.push(quizPath);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <Link href="/dashboard/courses">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Courses</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {isLoadingQuizzes ? (
                <div className="text-slate-400 text-sm">Loading quiz...</div>
              ) : lessonQuiz && lessonQuiz.id ? (
                <Link href={`/dashboard/quizzes/${lessonQuiz.id}`}>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg px-4 sm:px-6 py-4 sm:py-6 min-w-[120px] sm:min-w-[140px] text-sm sm:text-base"
                  >
                    <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">Take Quiz</span>
                    <span className="sm:hidden">Quiz</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  disabled
                  className="bg-slate-700 text-slate-400 shadow-lg px-4 sm:px-6 py-4 sm:py-6 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] sm:min-w-[140px] text-sm sm:text-base"
                >
                  <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">No Quiz Available</span>
                  <span className="sm:hidden">No Quiz</span>
                </Button>
              )}
            </div>
          </div>
          <div className="mb-2">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{lesson.title}</h1>
            <p className="text-slate-400 text-sm sm:text-lg">{lesson.description || `Session ${lesson.sessionNumber} - Java OOP`}</p>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Course Material</CardTitle>
                  <CardDescription className="text-slate-400">
                    {lesson.courseMaterial.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!slideExpanded ? (
                <div className="space-y-4">
                  <div
                    className="relative aspect-[16/10] bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={handleSlideView}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900">
                      <div className="p-6 bg-slate-900/50 rounded-full mb-4">
                        <FileText className="h-16 w-16 text-slate-500" />
                      </div>
                      <p className="text-slate-300 font-medium mb-1">{lesson.courseMaterial.fileName}</p>
                      <p className="text-slate-500 text-sm">Click to view</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary rounded-full p-4 shadow-xl">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold text-lg">{lesson.courseMaterial.title}</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSlideModalOpen(true)}
                        className="text-slate-400 hover:text-white"
                        title="Expand to fullscreen"
                      >
                        <Maximize2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSlideExpanded(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative w-full aspect-[16/10] rounded-xl border border-slate-700 overflow-hidden bg-slate-900">
                    <iframe
                      ref={slideIframeRef}
                      src={getSlideViewerUrl(lesson.courseMaterial.fileUrl)}
                      title={lesson.courseMaterial.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Video Lessons</CardTitle>
                  <CardDescription className="text-slate-400">
                    {sortedVideos.length} video{sortedVideos.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sortedVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No videos available for this lesson</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {sortedVideos.map((video) => (
                    <VideoItemWithProgress
                      key={video.id}
                      video={video}
                      onWatch={handleVideoWatch}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {lessonQuiz && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <HelpCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">Session Quiz</CardTitle>
                      <CardDescription className="text-slate-400">
                        Test your understanding of this lesson
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleTakeQuiz}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Take Quiz
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-semibold text-lg mb-2">{lessonQuiz.title}</h3>
                    {lessonQuiz.description && (
                      <p className="text-slate-400 mb-4">{lessonQuiz.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileText className="h-4 w-4" />
                      <span>{lessonQuiz.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Passing score: {lessonQuiz.passingScore}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {lessonQuiz && quizAttempts && quizAttempts.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Quiz Results</CardTitle>
                    <CardDescription className="text-slate-400">
                      Your quiz attempts and scores
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quizAttempts.map((attempt) => {
                    let timeTaken = attempt.metadata?.timeTaken;
                    if (timeTaken === undefined || timeTaken === null) {
                      if (attempt.timeRemaining !== undefined && attempt.timeRemaining !== null) {
                        timeTaken = 600 - attempt.timeRemaining;
                      } else {
                        timeTaken = 0;
                      }
                    }
                    const minutes = Math.floor(timeTaken / 60);
                    const seconds = timeTaken % 60;
                    const isPassed = attempt.status === 'passed';
                    const isFailed = attempt.status === 'failed';

                    return (
                      <div
                        key={attempt.id}
                        className={`p-4 rounded-lg border-2 ${isPassed
                            ? 'border-green-500/50 bg-green-500/10'
                            : isFailed
                              ? 'border-red-500/50 bg-red-500/10'
                              : 'border-slate-700 bg-slate-800/50'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-slate-400">
                                Attempt {attempt.attemptNumber} of 3
                              </span>
                              {isPassed && (
                                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Passed
                                </span>
                              )}
                              {isFailed && (
                                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-medium flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Trophy className={`h-4 w-4 ${isPassed ? 'text-green-500' : 'text-slate-500'}`} />
                                <span className="text-white font-semibold">
                                  {attempt.score || 0}%
                                </span>
                                <span className="text-slate-400">
                                  ({attempt.correctAnswers || 0}/{attempt.totalQuestions || 0} correct)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-medium text-white">
                                  Time: {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
                                </span>
                              </div>
                            </div>
                            {attempt.createdAt && (
                              <div className="text-xs text-slate-500 mt-2">
                                {new Date(attempt.createdAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={slideModalOpen} onOpenChange={handleSlideModalOpen}>
          <DialogContent onClose={() => setSlideModalOpen(false)} className="max-w-[95vw] h-[95vh] p-0">
            <DialogHeader className="p-6 pb-4 border-b border-slate-800">
              <DialogTitle className="text-xl">{lesson.courseMaterial.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-6 pt-4">
              <div className="w-full h-full rounded-lg border border-slate-700 overflow-hidden">
                <iframe
                  ref={slideIframeRef}
                  src={getSlideViewerUrl(lesson.courseMaterial.fileUrl)}
                  title={lesson.courseMaterial.title}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

