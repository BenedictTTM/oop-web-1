import { apiClient } from './api/client';

export enum ActivityType {
    COURSE_ACCESSED = 'course_accessed',
    VIDEO_WATCHED = 'video_watched',
    QUIZ_COMPLETED = 'quiz_completed',
    QUIZ_STARTED = 'quiz_started',
    MATERIAL_VIEWED = 'material_viewed',
    LOGIN = 'login',
    DASHBOARD_ACCESSED = 'dashboard_accessed',
}

interface LogActivityParams {
    activityType: ActivityType;
    action: string;
    title?: string;
    description?: string;
    metadata?: Record<string, any>;
    score?: number;
}


export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        await apiClient.post('/api/student/activities', params);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
