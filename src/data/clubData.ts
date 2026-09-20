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

export const CLUB_SCHEDULE: Record<number, DaySchedule> = {
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

// Реальные фотографии из канала @dusha_avalon и Усадьбы Свиблово
export const REAL_PHOTOS = {
  usadbaMain: '/images/usadba/main_palace.jpg',
  usadbaFront: '/images/usadba/sviblovo_front.jpg',
  usadbaFacade: '/images/usadba/manor_facade.jpg',
  usadbaGarden: '/images/usadba/manor_garden.jpg',
  usadbaWest: '/images/usadba/west_wing.jpg',
  avatar: '/images/club/channel_avatar.jpg',
  logo: '/images/club/logo_round_512.png',
  logoThumb: '/images/club/logo_round_128.png',

  // Фотографии побед и танцоров клуба
  arishaSeasonOpen: '/images/club/dusha_avalon_2413_0.jpg', // Ариша 1 место Н3 (горизонтальное 800x600)
  mishaArishaWin: '/images/club/dusha_avalon_2327_0.jpg', // Миша и Арина на турнире
  leshaAnya: '/images/club/dusha_avalon_2338_0.jpg', // Леша и Аня призеры
  petyaMasha: '/images/club/dusha_avalon_2340_0.jpg', // Петя и Маша финалисты Взрослые ASM
  galimovaSasha: '/images/club/dusha_avalon_2378_0.jpg', // Саша Галимова Д класс
  tsaturyanCamp: '/images/club/dusha_avalon_2391_0.jpg', // Сборы по латине у Армена Цатуряна в Крокусе
  veraSolovtsova: '/images/club/dusha_avalon_2296_0.jpg', // Вера Соловцова 2 место Н2
  tulaTournament: '/images/club/dusha_avalon_2071_4.jpg', // Команда в Туле (21 участник)
  sviblovoTournament: '/images/club/dusha_avalon_1999_0.jpg', // Турнир в Усадьбе
  matveyGrisha: '/images/club/dusha_avalon_2335_0.jpg', // Матвей и Гриша
  annaTurchinaCoach: '/images/club/dusha_avalon_2071_5.jpg', // Анна Турчина с воспитанницей на турнире
};

export const COACHES_STAFF = [
  {
    name: 'Анна Турчина',
    role: 'Руководитель ТСК «Авалон», главный тренер',
    badge: 'Основатель клуба',
    desc: 'Ведет группы начальной подготовки от 4 лет, классический балет, функциональные турнирные прогоны и пары.',
    photo: REAL_PHOTOS.annaTurchinaCoach,
    specs: ['Начальная подготовка', 'Балет', 'Постановка пар', 'Прогоны']
  },
  {
    name: 'Максим Проскурин и Татьяна Рот-Серова',
    role: 'Направление Латиноамериканской программы',
    badge: 'PRO Латина & Бейзик',
    desc: 'Максим Проскурин ведет мужскую технику бейзика, скорость и конкурсную латину. Татьяна Рот-Серова ставит работу стопы и женскую пластику.',
    photo: REAL_PHOTOS.tsaturyanCamp,
    specs: ['PRO Латина', 'Мужской бейзик', 'Работа стопы', 'Сборы в Крокусе']
  },
  {
    name: 'Александр Семенов и Александр Островский',
    role: 'Направление Европейской программы и ОФП',
    badge: 'PRO Стандарт & Хореография',
    desc: 'Александр Семенов ведет конкурсный стандарт, джаз и ОФП. Александр Островский отвечает за баланс в паре, вращения и танго.',
    photo: REAL_PHOTOS.petyaMasha,
    specs: ['Европейская программа', 'Танго', 'Джаз', 'ОФП в парке']
  }
];
