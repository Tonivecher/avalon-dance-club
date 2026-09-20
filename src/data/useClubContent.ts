import { useState, useEffect, useCallback } from 'react';
import { CLUB_SCHEDULE, COACHES_STAFF, REAL_PHOTOS, type DaySchedule, type ScheduleItem } from './clubData';

export interface CoachData {
  id: string;
  name: string;
  role: string;
  badge: string;
  desc: string;
  photo: string;
  specs: string[];
  order: number;
}

export interface AnnouncementData {
  id: string;
  title: string;
  text: string;
  tag: string;
  date: string;
  photo?: string;
  active: boolean;
}

export interface GalleryData {
  id: string;
  title: string;
  caption: string;
  badge: string;
  category?: string;
  photo: string;
  order: number;
}

export interface HallStatusData {
  status: string;
  announcement: string;
  updatedAt: string;
}

export interface ClubContentData {
  hallStatus: HallStatusData;
  coaches: CoachData[];
  announcements: AnnouncementData[];
  schedule: Record<number, DaySchedule>;
  gallery: GalleryData[];
}

const DEFAULT_COACHES: CoachData[] = COACHES_STAFF.map((c, idx) => ({
  id: `coach-${idx + 1}`,
  name: c.name,
  role: c.role,
  badge: c.badge,
  desc: c.desc,
  photo: c.photo,
  specs: c.specs,
  order: idx + 1
}));

const DEFAULT_GALLERY: GalleryData[] = [
  {
    id: 'gal-arisha',
    title: 'Арина открывает танцевальный сезон',
    caption: 'Самая юная участница в категории, победившая по итогам всех туров.',
    badge: '1 место и Суперкубок',
    category: 'Н3',
    photo: REAL_PHOTOS.arishaSeasonOpen,
    order: 1
  },
  {
    id: 'gal-usadba',
    title: 'Бальный зал Усадьбы Свиблово',
    caption: 'Москва, Лазоревый проезд, 15 (м. Ботанический сад)',
    badge: 'Исторический зал',
    category: 'Усадьба Свиблово',
    photo: REAL_PHOTOS.usadbaFront,
    order: 2
  },
  {
    id: 'gal-misha-arisha',
    title: 'Миша и Арина',
    caption: 'Победы и финалы на турнирах в Москве и Санкт-Петербурге',
    badge: 'Конкурсная пара',
    category: 'Конкурсный состав',
    photo: REAL_PHOTOS.mishaArishaWin,
    order: 3
  },
  {
    id: 'gal-tsaturyan',
    title: 'Интенсив по латине',
    caption: 'Тренировки с чемпионом мира Арменом Цатуряном в Крокус Экспо',
    badge: 'Сборы в Крокусе',
    category: 'Сборы',
    photo: REAL_PHOTOS.tsaturyanCamp,
    order: 4
  },
  {
    id: 'gal-petya-masha',
    title: 'Петя и Маша',
    caption: 'Финалисты официального первенства в категории Взрослые ASM',
    badge: 'Взрослые ASM',
    category: 'Взрослые',
    photo: REAL_PHOTOS.petyaMasha,
    order: 5
  },
  {
    id: 'gal-vera',
    title: 'Вера Соловцова',
    caption: 'Выход из четвертьфинала на 2 призовое место',
    badge: 'Категория Н2',
    category: 'Н2',
    photo: REAL_PHOTOS.veraSolovtsova,
    order: 6
  }
];

const INITIAL_CONTENT: ClubContentData = {
  hallStatus: {
    status: 'Зал открыт • Занятия строго по расписанию',
    announcement: '',
    updatedAt: new Date().toISOString()
  },
  coaches: DEFAULT_COACHES,
  announcements: [],
  schedule: CLUB_SCHEDULE,
  gallery: DEFAULT_GALLERY
};

export function useClubContent() {
  const [content, setContent] = useState<ClubContentData>(INITIAL_CONTENT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/content');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      setContent(prev => ({
        hallStatus: data.hallStatus || prev.hallStatus,
        coaches: Array.isArray(data.coaches) && data.coaches.length > 0 ? data.coaches : prev.coaches,
        announcements: Array.isArray(data.announcements) ? data.announcements : prev.announcements,
        schedule: data.schedule && Object.keys(data.schedule).length > 0 ? data.schedule : prev.schedule,
        gallery: Array.isArray(data.gallery) && data.gallery.length > 0 ? data.gallery : prev.gallery
      }));
      setError(null);
    } catch (err: any) {
      // Graceful fallback to static defaults, do not crash UI
      setError(err?.message || 'Offline');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
    // Poll every 30 seconds for live updates from the bot
    const interval = setInterval(fetchContent, 30000);
    return () => clearInterval(interval);
  }, [fetchContent]);

  return {
    content,
    isLoading,
    error,
    refresh: fetchContent
  };
}
