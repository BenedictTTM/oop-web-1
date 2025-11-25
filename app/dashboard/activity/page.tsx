'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, BookOpen, Video, FileText, Clock, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface ActivityLog {
  id: string;
  activityType: string;
  action: string;
  title?: string;
  score?: number;
  createdAt: string;
}

interface UIActivity {
  id: string;
  type: string;
  action: string;
  title: string;
  score?: number;
  timestamp: string;
  icon: any;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<UIActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await apiClient.get('/api/student/activities');
        const data: ActivityLog[] = response.data;

        const mappedActivities: UIActivity[] = data.map((item) => {
          let type = 'other';
          let icon = Activity;

          if (item.activityType === 'video_watch') {
            type = 'video';
            icon = Video;
          } else if (item.activityType === 'quiz_attempt') {
            type = 'quiz';
            icon = FileText;
          } else if (item.activityType === 'course_access') {
            type = 'course';
            icon = BookOpen;
          }

          return {
            id: item.id,
            type,
            action: item.action,
            title: item.title || 'Untitled Activity',
            score: item.score,
            timestamp: formatTimeAgo(item.createdAt),
            icon,
          };
        });

        setActivities(mappedActivities);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setError('Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400 mt-1">Track all your learning activities and progress</p>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Recent Activities</CardTitle>
          <CardDescription className="text-slate-400">Your learning history</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : activities.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No activities found</div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-800 hover:bg-slate-800 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{activity.title}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {activity.action}
                            {activity.score !== undefined && activity.score !== null && ` • Score: ${activity.score}%`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-4 w-4" />
                          {activity.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

