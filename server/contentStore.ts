import * as fs from 'fs';
import * as path from 'path';

export interface ScheduleItem {
  time: string;
  title: string;
  coach: string;
  room: string;
  category: 'kids' | 'junior' | 'pro' | 'choreo';
}

export interface DaySchedule {
  dayName: string;
  shortName: string;
  items: ScheduleItem[];
  announcement?: string;
}

export interface Coach {
  id: string;
  name: string;
  role: string;
  badge: string;
  desc: string;
  photo: string;
  specs: string[];
  order: number;
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  tag: string;
  date: string;
  photo?: string;
  active: boolean;
  tgMessageId?: number;
  source?: 'bot' | 'channel';
}


export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  badge: string;
  category?: string;
  photo: string;
  order: number;
}

export interface HallStatus {
  status: string;
  announcement: string;
  updatedAt: string;
}

export interface ClubContent {
  hallStatus: HallStatus;
  coaches: Coach[];
  announcements: Announcement[];
  schedule: Record<number, DaySchedule>;
  gallery: GalleryItem[];
}

const dataDir = path.join(import.meta.dir, 'data');
const contentFilePath = path.join(dataDir, 'content.json');

const INITIAL_SCHEDULE: Record<number, DaySchedule> = {
  1: {
    dayName: 'Понедельник',
    shortName: 'ПН',
    items: [
      { time: '17:00 – 18:00', title: 'Младшая группа (Школа танца Н2–Н4)', coach: 'Анна Турчина', room: '1 этаж', category: 'kids' },
      { time: '17:00 – 18:00', title: 'Средняя группа — Латина', coach: 'Анна Турчина', room: 'Актовый зал', category: 'junior' },
      { time: '18:00 – 18:45', title: 'Мужская техника бейзик (Латина)', coach: 'Максим Проскурин', room: 'Актовый зал', category: 'pro' },
      { time: '18:00 – 18:45', title: 'Женская техника бейзик (Латина)', coach: 'Татьяна Рот-Серова', room: 'Конференц-зал', category: 'pro' },
      { time: '19:00 – 19:45', title: 'Старшие ЛА ПРО', coach: 'Максим Проскурин', room: 'Актовый зал', category: 'pro' },
      { time: '20:00 – 21:00', title: 'Функциональный прогон ЛА', coach: 'Анна Турчина', room: 'Актовый зал', category: 'pro' }
    ]
  },
  2: {
    dayName: 'Вторник',
    shortName: 'ВТ',
    items: [
      { time: '15:30 – 19:00', title: 'Свободная практика и индивидуальные уроки', coach: 'По записи', room: 'Бальный зал', category: 'pro' }
    ],
    announcement: 'Индивидуальные уроки, постановка турнирных вариаций'
  },
  3: {
    dayName: 'Среда',
    shortName: 'СР',
    items: [
      { time: '17:00 – 18:00', title: 'Младшая группа — Стандарт', coach: 'Анна Турчина', room: '1 этаж', category: 'kids' },
      { time: '17:00 – 18:00', title: 'Средняя группа — Стандарт', coach: 'Александр Семенов', room: 'Актовый зал', category: 'junior' },
      { time: '18:00 – 19:00', title: 'Конкурсная группа СТ средние', coach: 'Александр Семенов', room: 'Конференц-зал', category: 'junior' },
      { time: '18:00 – 19:30', title: 'Старшая группа СТ', coach: 'Анна Турчина', room: 'Актовый зал', category: 'pro' },
      { time: '19:30 – 20:30', title: 'ПРО СТ — Спецкурс Танго', coach: 'Александр Островский', room: 'Актовый зал', category: 'pro' },
      { time: '20:15 – 21:00', title: 'ОФП и растяжка', coach: 'Тренерский состав', room: 'Актовый зал', category: 'choreo' }
    ]
  },
  4: {
    dayName: 'Четверг',
    shortName: 'ЧТ',
    items: [
      { time: '18:00 – 19:00', title: 'Балет и классическая хореография', coach: 'Анна Турчина', room: 'Актовый зал', category: 'choreo' },
      { time: '19:00 – 20:00', title: 'Джаз и современная пластика', coach: 'Александр Семенов', room: 'Актовый зал', category: 'choreo' }
    ]
  },
  5: {
    dayName: 'Пятница',
    shortName: 'ПТ',
    items: [
      { time: '17:00 – 18:00', title: 'Младшая и средняя группа ЛА', coach: 'Анна Турчина', room: 'Актовый зал', category: 'kids' },
      { time: '18:00 – 19:30', title: 'Конкурсный функциональный прогон', coach: 'Александр Семенов', room: 'Конференц-зал', category: 'junior' },
      { time: '18:00 – 20:00', title: 'Старшая группа: Прогон Латина + Стандарт', coach: 'Анна Турчина', room: 'Актовый зал', category: 'pro' },
      { time: '20:00 – 20:30', title: 'Скакалка и пробежка в парке усадьбы', coach: 'Тренерский состав', room: 'Парк у Яузы', category: 'choreo' }
    ]
  },
  6: {
    dayName: 'Суббота',
    shortName: 'СБ',
    items: [
      { time: '11:00 – 15:00', title: 'Индивидуальные уроки и подготовка к стартам', coach: 'По записи', room: 'Бальный зал', category: 'pro' }
    ],
    announcement: 'Подготовка костюмов, укладка турнирных причесок'
  },
  0: {
    dayName: 'Воскресенье',
    shortName: 'ВС',
    items: [
      { time: '08:30 – 20:00', title: 'Турниры ФТСР в Москве и других городах', coach: 'Анна Турчина & наставники', room: 'Турнирный паркет', category: 'pro' }
    ],
    announcement: 'Трансфер от метро Ботанический сад, тренерское сопровождение'
  }
};

const INITIAL_COACHES: Coach[] = [
  {
    id: 'coach-turchina',
    name: 'Анна Турчина',
    role: 'Руководитель ТСК «Авалон», главный тренер',
    badge: 'Основатель клуба',
    desc: 'Ведет группы начальной подготовки от 4 лет, классический балет, функциональные турнирные прогоны и пары.',
    photo: '/images/club/dusha_avalon_2071_5.jpg',
    specs: ['Начальная подготовка', 'Балет', 'Постановка пар', 'Прогоны'],
    order: 1
  },
  {
    id: 'coach-proskurin',
    name: 'Максим Проскурин и Татьяна Рот-Серова',
    role: 'Направление Латиноамериканской программы',
    badge: 'PRO Латина & Бейзик',
    desc: 'Максим Проскурин ведет мужскую технику бейзика, скорость и конкурсную латину. Татьяна Рот-Серова ставит работу стопы и женскую пластику.',
    photo: '/images/club/dusha_avalon_2391_0.jpg',
    specs: ['PRO Латина', 'Мужской бейзик', 'Работа стопы', 'Сборы в Крокусе'],
    order: 2
  },
  {
    id: 'coach-semenov',
    name: 'Александр Семенов и Александр Островский',
    role: 'Направление Европейской программы и ОФП',
    badge: 'PRO Стандарт & Хореография',
    desc: 'Александр Семенов ведет конкурсный стандарт, джаз и ОФП. Александр Островский отвечает за баланс в паре, вращения и танго.',
    photo: '/images/club/dusha_avalon_2340_0.jpg',
    specs: ['Европейская программа', 'Танго', 'Джаз', 'ОФП в парке'],
    order: 3
  }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-open-season',
    title: 'Открытый набор в группы бальных танцев сезона 2026',
    text: 'Приглашаем детей от 4 до 12 лет на бесплатный просмотр и пробное занятие в бальном зале Усадьбы Свиблово.',
    tag: 'Набор 2026',
    date: '2026-09-20',
    active: true
  }
];

const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'gal-arisha',
    title: 'Арина открывает танцевальный сезон',
    caption: 'Самая юная участница в категории, победившая по итогам всех туров.',
    badge: '1 место и Суперкубок',
    category: 'Н3',
    photo: '/images/club/dusha_avalon_2413_0.jpg',
    order: 1
  },
  {
    id: 'gal-usadba',
    title: 'Бальный зал Усадьбы Свиблово',
    caption: 'Москва, Лазоревый проезд, 15 (м. Ботанический сад)',
    badge: 'Исторический зал',
    category: 'Усадьба Свиблово',
    photo: '/images/usadba/sviblovo_front.jpg',
    order: 2
  },
  {
    id: 'gal-misha-arisha',
    title: 'Миша и Арина',
    caption: 'Победы и финалы на турнирах в Москве и Санкт-Петербурге',
    badge: 'Конкурсная пара',
    category: 'Конкурсный состав',
    photo: '/images/club/dusha_avalon_2327_0.jpg',
    order: 3
  },
  {
    id: 'gal-tsaturyan',
    title: 'Интенсив по латине',
    caption: 'Тренировки с чемпионом мира Арменом Цатуряном в Крокус Экспо',
    badge: 'Сборы в Крокусе',
    category: 'Сборы',
    photo: '/images/club/dusha_avalon_2391_0.jpg',
    order: 4
  },
  {
    id: 'gal-petya-masha',
    title: 'Петя и Маша',
    caption: 'Финалисты официального первенства в категории Взрослые ASM',
    badge: 'Взрослые ASM',
    category: 'Взрослые',
    photo: '/images/club/dusha_avalon_2340_0.jpg',
    order: 5
  },
  {
    id: 'gal-vera',
    title: 'Вера Соловцова',
    caption: 'Выход из четвертьфинала на 2 призовое место',
    badge: 'Категория Н2',
    category: 'Н2',
    photo: '/images/club/dusha_avalon_2296_0.jpg',
    order: 6
  }
];

let cachedContent: ClubContent | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function safeWriteContent(content: ClubContent) {
  ensureDataDirectory();
  const tempPath = `${contentFilePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(content, null, 2), 'utf-8');
  fs.renameSync(tempPath, contentFilePath);
  cachedContent = content;
}

export function initContentStore(): ClubContent {
  ensureDataDirectory();

  // Legacy migration check: if old hall_status.json exists, copy it
  let legacyStatus: HallStatus = {
    status: 'Зал открыт • Занятия строго по расписанию',
    announcement: '',
    updatedAt: new Date().toISOString()
  };

  const legacyStatusPath = path.join(import.meta.dir, 'hall_status.json');
  if (fs.existsSync(legacyStatusPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(legacyStatusPath, 'utf-8'));
      if (parsed.status) {
        legacyStatus = parsed;
      }
    } catch {}
  }

  if (fs.existsSync(contentFilePath)) {
    try {
      const fileData = fs.readFileSync(contentFilePath, 'utf-8');
      cachedContent = JSON.parse(fileData);
      return cachedContent!;
    } catch (e) {
      console.error('Error reading content.json, reseeding with defaults:', e);
    }
  }

  // Seed default data
  const initialContent: ClubContent = {
    hallStatus: legacyStatus,
    coaches: INITIAL_COACHES,
    announcements: INITIAL_ANNOUNCEMENTS,
    schedule: INITIAL_SCHEDULE,
    gallery: INITIAL_GALLERY
  };

  safeWriteContent(initialContent);
  return initialContent;
}

export function getContent(): ClubContent {
  if (!cachedContent) {
    return initContentStore();
  }
  return cachedContent;
}

// ============ Coaches CRUD ============

export function getCoaches(): Coach[] {
  const content = getContent();
  return [...content.coaches].sort((a, b) => a.order - b.order);
}

export function saveCoach(coach: Coach): void {
  const content = getContent();
  const existingIdx = content.coaches.findIndex(c => c.id === coach.id);
  if (existingIdx >= 0) {
    content.coaches[existingIdx] = coach;
  } else {
    content.coaches.push(coach);
  }
  safeWriteContent(content);
}

export function deleteCoach(coachId: string): boolean {
  const content = getContent();
  const initialLen = content.coaches.length;
  content.coaches = content.coaches.filter(c => c.id !== coachId);
  if (content.coaches.length !== initialLen) {
    safeWriteContent(content);
    return true;
  }
  return false;
}

// ============ Announcements CRUD ============

export function getAnnouncements(): Announcement[] {
  const content = getContent();
  return content.announcements || [];
}

export function saveAnnouncement(ann: Announcement): void {
  const content = getContent();
  if (!content.announcements) content.announcements = [];
  const idx = content.announcements.findIndex(a => a.id === ann.id);
  if (idx >= 0) {
    content.announcements[idx] = ann;
  } else {
    content.announcements.unshift(ann);
  }
  safeWriteContent(content);
}

export function deleteAnnouncement(annId: string): boolean {
  const content = getContent();
  if (!content.announcements) return false;
  const initialLen = content.announcements.length;
  content.announcements = content.announcements.filter(a => a.id !== annId);
  if (content.announcements.length !== initialLen) {
    safeWriteContent(content);
    return true;
  }
  return false;
}

// ============ Schedule CRUD ============

export function getSchedule(): Record<number, DaySchedule> {
  const content = getContent();
  return content.schedule;
}

export function saveScheduleItem(dayKey: number, item: ScheduleItem, itemIndex?: number): void {
  const content = getContent();
  if (!content.schedule[dayKey]) {
    content.schedule[dayKey] = {
      dayName: getDayName(dayKey),
      shortName: getDayShortName(dayKey),
      items: []
    };
  }

  if (typeof itemIndex === 'number' && itemIndex >= 0 && itemIndex < content.schedule[dayKey].items.length) {
    content.schedule[dayKey].items[itemIndex] = item;
  } else {
    content.schedule[dayKey].items.push(item);
  }
  safeWriteContent(content);
}

export function deleteScheduleItem(dayKey: number, itemIndex: number): boolean {
  const content = getContent();
  if (!content.schedule[dayKey] || !content.schedule[dayKey].items[itemIndex]) {
    return false;
  }
  content.schedule[dayKey].items.splice(itemIndex, 1);
  safeWriteContent(content);
  return true;
}

export function saveDayAnnouncement(dayKey: number, announcementText: string): void {
  const content = getContent();
  if (!content.schedule[dayKey]) return;
  content.schedule[dayKey].announcement = announcementText.trim() || undefined;
  safeWriteContent(content);
}

// ============ Gallery CRUD ============

export function getGallery(): GalleryItem[] {
  const content = getContent();
  return [...content.gallery].sort((a, b) => a.order - b.order);
}

export function saveGalleryItem(item: GalleryItem): void {
  const content = getContent();
  const existingIdx = content.gallery.findIndex(g => g.id === item.id);
  if (existingIdx >= 0) {
    content.gallery[existingIdx] = item;
  } else {
    content.gallery.push(item);
  }
  safeWriteContent(content);
}

export function deleteGalleryItem(itemId: string): boolean {
  const content = getContent();
  const initialLen = content.gallery.length;
  content.gallery = content.gallery.filter(g => g.id !== itemId);
  if (content.gallery.length !== initialLen) {
    safeWriteContent(content);
    return true;
  }
  return false;
}

// ============ Hall Status ============

export function getHallStatus(): HallStatus {
  const content = getContent();
  return content.hallStatus;
}

export function updateHallStatus(newStatus: string, announcement: string = ''): HallStatus {
  const content = getContent();
  content.hallStatus = {
    status: newStatus,
    announcement,
    updatedAt: new Date().toISOString()
  };
  safeWriteContent(content);
  return content.hallStatus;
}

// ============ Helpers ============

function getDayName(day: number): string {
  const names: Record<number, string> = {
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
    0: 'Воскресенье'
  };
  return names[day] || 'День';
}

function getDayShortName(day: number): string {
  const names: Record<number, string> = {
    1: 'ПН',
    2: 'ВТ',
    3: 'СР',
    4: 'ЧТ',
    5: 'ПТ',
    6: 'СБ',
    0: 'ВС'
  };
  return names[day] || '';
}
