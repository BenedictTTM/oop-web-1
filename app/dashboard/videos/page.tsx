'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Play, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const videoLessons = [
  {
    id: 1,
    title: 'Java OOP: Classes and Objects',
    description: 'Learn the fundamentals of classes and objects in Java',
    language: 'Java',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '15:30',
    watched: false,
  },
  {
    id: 2,
    title: 'Java OOP: Inheritance',
    description: 'Understanding inheritance and method overriding',
    language: 'Java',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '18:45',
    watched: true,
  },
  {
    id: 3,
    title: 'Python OOP: Classes and Instances',
    description: 'Introduction to classes and instances in Python',
    language: 'Python',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '12:20',
    watched: false,
  },
  {
    id: 4,
    title: 'PHP OOP: Classes and Properties',
    description: 'Creating classes and properties in PHP',
    language: 'PHP',
    youtubeId: 'dQw4w9WgXcQ',
    duration: '14:10',
    watched: false,
  },

];

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Video Lessons</h1>
        <p className="text-slate-400 mt-1">Watch YouTube tutorials for each lesson</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videoLessons.map((lesson) => (
          <Card key={lesson.id} className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <div className="relative aspect-video bg-slate-800 rounded-t-lg overflow-hidden">
              <img
                src={`https://img.youtube.com/vi/${lesson.youtubeId}/maxresdefault.jpg`}
                alt={lesson.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 rounded-full"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${lesson.youtubeId}`, '_blank')}
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
              {lesson.watched && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500 bg-slate-900 rounded-full" />
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-white text-base">{lesson.title}</CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">{lesson.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {lesson.language}
                </span>
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  {lesson.duration}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

