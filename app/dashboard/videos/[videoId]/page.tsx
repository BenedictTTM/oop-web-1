'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { logActivity, ActivityType } from '@/lib/activity-logger';

interface Video {
    id: string;
    title: string;
    description: string;
    youtubeVideoId: string;
    youtubeUrl: string;
    duration: number;
    language: string;
    lessonId: string;
    watched?: boolean;
}

export default function VideoPlayerPage() {
    const params = useParams();
    const router = useRouter();
    const videoId = params.videoId as string;

    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [watched, setWatched] = useState(false);

    useEffect(() => {
        const fetchVideo = async () => {
            try {
                const response = await apiClient.get(`api/videos/${videoId}`);
                setVideo(response.data);
                setWatched(response.data.watched || false);
            } catch (error) {
                console.error('Failed to fetch video:', error);
            } finally {
                setLoading(false);
            }
        };

        if (videoId) {
            fetchVideo();
        }
    }, [videoId]);

    const markAsWatched = async () => {
        try {
            await apiClient.post('api/progress/video/watched', {
                videoId: videoId,
                progressPercentage: 100
            });
            setWatched(true);

            // Log video watched activity
            await logActivity({
                activityType: ActivityType.VIDEO_WATCHED,
                action: 'Watched a video',
                title: video?.title,
                description: `Completed watching: ${video?.title}`,
                metadata: {
                    videoId: videoId,
                    duration: video?.duration
                }
            });
        } catch (error) {
            console.error('Failed to mark video as watched:', error);
        }
    };

    // Mark video as watched after 80% of duration
    useEffect(() => {
        if (!video || watched) return;

        const duration = video.duration || 300; // Default 5 minutes if no duration
        const watchThreshold = duration * 0.8 * 1000; // 80% of video duration in ms

        const timer = setTimeout(() => {
            markAsWatched();
        }, watchThreshold);

        return () => clearTimeout(timer);
    }, [video, watched]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white">Loading video...</div>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 ">
                <div className="text-white text-xl">Video not found</div>
                <Button className='hover:text-slate-900' onClick={() => router.push('/dashboard/videos')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Videos
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/videos')}
                    className="text-slate-400 hover:text-slate-900 "
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Videos
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Player */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                        <div className="relative aspect-video bg-slate-950">
                            <iframe
                                src={`https://www.youtube.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0`}
                                title={video.title}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-white text-2xl">{video.title}</CardTitle>
                                    {watched && (
                                        <div className="flex items-center gap-2 mt-2 text-green-500">
                                            <CheckCircle2 className="h-5 w-5" />
                                            <span className="text-sm font-medium">Watched</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {video.description && (
                                <div>
                                    <h3 className="text-white font-semibold mb-2">Description</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{video.description}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm">{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : 'N/A'}</span>
                                </div>
                                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                    {video.language}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {!watched && (
                                <Button
                                    onClick={markAsWatched}
                                    className="w-full bg-primary hover:bg-primary/90"
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Watched
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => window.open(video.youtubeUrl, '_blank')}
                                className="w-full border-slate-700 text-slate-900 hover:text-white hover:bg-slate-800"
                            >
                                Watch on YouTube
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => router.push('/dashboard/videos')}
                                className="w-full border-slate-700 text-slate-900 hover:text-white hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                All Videos
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl mt-6">
                        <CardHeader>
                            <CardTitle className="text-white text-sm">About</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-400 text-xs">
                                Videos are automatically marked as watched after viewing 80% of the content.
                                You can also manually mark them as complete.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
