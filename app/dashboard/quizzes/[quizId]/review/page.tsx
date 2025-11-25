'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
}

interface QuizAttempt {
    id: string;
    attemptNumber: number;
    status: string;
    score?: number;
    totalQuestions?: number;
    correctAnswers?: number;
    answers?: Record<string, any>;
    metadata?: {
        questions?: QuizQuestion[];
    };
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

export default function QuizReviewPage() {
    const params = useParams();
    const router = useRouter();
    const quizId = params.quizId as string;

    const { data: attempt, isLoading: isLoadingAttempt } = useQuery<QuizAttempt>({
        queryKey: ['quizAttempt', quizId, 'review'],
        queryFn: async () => {
            // Get the latest completed attempt for this quiz
            const response = await apiClient.get(`/api/students/me/completed-quizzes`);
            const completed = response.data.completed || [];
            const quizAttempt = completed.find((q: any) => q.quizId === quizId);

            if (!quizAttempt) {
                throw new Error('No completed attempt found for this quiz');
            }

            // Fetch full attempt details including answers
            const attemptResponse = await apiClient.get(`/api/quiz-attempts/${quizAttempt.attemptId}`);
            return attemptResponse.data;
        },
        enabled: !!quizId,
    });

    const { data: quiz, isLoading: isLoadingQuiz } = useQuery<Quiz>({
        queryKey: ['quiz', quizId],
        queryFn: async () => {
            const response = await apiClient.get(`/api/quizzes/${quizId}`);
            return response.data;
        },
        enabled: !!quizId,
    });

    if (isLoadingAttempt || isLoadingQuiz) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center text-slate-400">Loading review...</div>
            </div>
        );
    }

    if (!attempt || !quiz) {
        return (
            <div className="min-h-screen bg-slate-950">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Card className="border-red-500/50 bg-red-500/10">
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">Review Unavailable</h2>
                            <p className="text-slate-300 mb-6">Could not load quiz attempt details.</p>
                            <Link href="/dashboard/quizzes">
                                <Button className="bg-primary hover:bg-primary/90">Back to Quizzes</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Use questions from metadata if available (snapshot at time of attempt), otherwise current quiz questions
    const questions = attempt.metadata?.questions || quiz.questions || [];
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
    const userAnswers = attempt.answers || {};

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <Link href="/dashboard/quizzes">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white mb-4 sm:mb-6">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Back to Quizzes</span>
                            <span className="sm:hidden">Back</span>
                        </Button>
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">{quiz.title}</h1>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${(attempt.score || 0) >= quiz.passingScore
                                        ? 'bg-green-500/20 text-green-500'
                                        : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    Score: {attempt.score}%
                                </span>
                                <span className="text-slate-400 text-sm">
                                    Attempt {attempt.attemptNumber}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {sortedQuestions.map((question, index) => {
                        const userAnswer = userAnswers[question.id];
                        let isCorrect = false;

                        if (question.questionType === QuestionType.SINGLE_CHOICE) {
                            isCorrect = userAnswer === question.correctAnswer;
                        } else if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
                            const correct = question.correctAnswer as number[];
                            const user = userAnswer as number[] || [];
                            isCorrect = Array.isArray(correct) && Array.isArray(user) &&
                                correct.length === user.length &&
                                correct.every(val => user.includes(val));
                        } else if (question.questionType === QuestionType.FILL_IN) {
                            isCorrect = String(userAnswer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
                        }

                        return (
                            <Card key={question.id} className={`border-slate-800 bg-slate-900/50 backdrop-blur-sm ${isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
                                }`}>
                                <CardHeader className="pb-3 sm:pb-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <CardTitle className="text-white text-lg sm:text-xl flex-1">
                                            <span className="text-slate-400 mr-2">{index + 1}.</span>
                                            {formatQuestionText(question.question)}
                                        </CardTitle>
                                        {isCorrect ? (
                                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    {question.codeSnippet && (
                                        <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                                            <pre className="bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
                                                <code>{question.codeSnippet}</code>
                                            </pre>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0 space-y-4">
                                    {/* Options Display */}
                                    {(question.questionType === QuestionType.SINGLE_CHOICE || question.questionType === QuestionType.MULTIPLE_CHOICE) && (
                                        <div className="space-y-2">
                                            {question.options.map((option, optIndex) => {
                                                const isSelected = Array.isArray(userAnswer)
                                                    ? userAnswer.includes(optIndex)
                                                    : userAnswer === optIndex;

                                                const isCorrectOption = Array.isArray(question.correctAnswer)
                                                    ? (question.correctAnswer as number[]).includes(optIndex)
                                                    : question.correctAnswer === optIndex;

                                                let optionClass = "p-3 rounded-lg border transition-all flex items-center gap-3 ";
                                                if (isCorrectOption) {
                                                    optionClass += "border-green-500/50 bg-green-500/10 text-green-100";
                                                } else if (isSelected && !isCorrectOption) {
                                                    optionClass += "border-red-500/50 bg-red-500/10 text-red-100";
                                                } else {
                                                    optionClass += "border-slate-700 bg-slate-800/50 text-slate-400";
                                                }

                                                return (
                                                    <div key={optIndex} className={optionClass}>
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${isCorrectOption ? 'border-green-500 bg-green-500' :
                                                                (isSelected ? 'border-red-500 bg-red-500' : 'border-slate-600')
                                                            }`}>
                                                            {(isSelected || isCorrectOption) && (
                                                                <div className="w-2 h-2 rounded-full bg-white" />
                                                            )}
                                                        </div>
                                                        <span className="text-sm sm:text-base">{option}</span>
                                                        {isCorrectOption && <span className="ml-auto text-xs text-green-400 font-medium">Correct Answer</span>}
                                                        {isSelected && !isCorrectOption && <span className="ml-auto text-xs text-red-400 font-medium">Your Answer</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {question.questionType === QuestionType.FILL_IN && (
                                        <div className="space-y-2">
                                            <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
                                                <span className="text-xs text-slate-400 block mb-1">Your Answer</span>
                                                <span className={isCorrect ? "text-green-400" : "text-red-400"}>{userAnswer || '(No answer)'}</span>
                                            </div>
                                            {!isCorrect && (
                                                <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                                                    <span className="text-xs text-green-400 block mb-1">Correct Answer</span>
                                                    <span className="text-green-100">{question.correctAnswer}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    <div className="mt-4 p-4 rounded-lg bg-slate-800/80 border border-slate-700">
                                        <div className="flex items-start gap-3">
                                            <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-primary mb-1">Explanation</h4>
                                                <p className="text-slate-300 text-sm leading-relaxed">{question.explanation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
