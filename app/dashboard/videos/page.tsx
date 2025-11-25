'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Play, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';


export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await apiClient.get('api/videos');
        setVideos(response.data);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Video Lessons</h1>
        <p className="text-slate-400 mt-1">Watch YouTube tutorials for each lesson</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="border-slate-800 bg-slate-900/80 backdrop-blur-xl cursor-pointer transition-all hover:border-primary/50"
            onClick={() => router.push(`/dashboard/videos/${video.id}`)}
          >
            <div className="relative aspect-video bg-slate-800 rounded-t-lg overflow-hidden">
              <img
                src={`https://img.youtube.com/vi/${video.youtubeVideoId}/maxresdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/40 transition-all hover:bg-black/60"
              >
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 rounded-full pointer-events-none"
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
              {video.watched && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500 bg-slate-900 rounded-full" />
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white text-base">{video.title}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">{video.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {video.language}
                </span>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  {video.duration}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
