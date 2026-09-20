import { Bot, InlineKeyboard, InputFile } from 'grammy';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {
  initContentStore,
  getContent,
  getCoaches,
  saveCoach,
  deleteCoach,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getSchedule,
  saveScheduleItem,
  deleteScheduleItem,
  saveDayAnnouncement,
  getGallery,
  saveGalleryItem,
  deleteGalleryItem,
  getHallStatus,
  updateHallStatus,
  type Coach,
  type Announcement,
  type GalleryItem,
  type ScheduleItem
} from './contentStore';
import {
  generateCoachBio,
  improveCoachBio,
  generateAnnouncementText,
  improveAnnouncementText,
  generateGalleryCaption,
  improveGalleryCaption,
  generateFreeCopilot
} from './aiService';

dotenv.config();


const token = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3018;

if (!token) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is not defined in .env');
  process.exit(1);
}

// Initialize content store with persistent seeding
initContentStore();

// ============ Admin Authorization & Whitelist ============

const adminsFilePath = path.join(import.meta.dir, 'data', 'admins.json');

// Default initial admins: user's chat ID (6014428402) and coaches (1892394649, 5213715303)
const DEFAULT_ADMINS = ['6014428402', '1892394649', '5213715303'];
if (process.env.TELEGRAM_ADMIN_CHAT_ID && process.env.TELEGRAM_ADMIN_CHAT_ID.trim()) {
  DEFAULT_ADMINS.push(process.env.TELEGRAM_ADMIN_CHAT_ID.trim());
}

function loadAdmins(): Set<string> {
  try {
    if (fs.existsSync(adminsFilePath)) {
      const raw = fs.readFileSync(adminsFilePath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const set = new Set<string>(list.map(String));
        DEFAULT_ADMINS.forEach(id => set.add(id));
        return set;
      }
    }
  } catch (err) {
    console.error('Failed to load admins.json:', err);
  }
  const set = new Set<string>(DEFAULT_ADMINS);
  saveAdmins(set);
  return set;
}

function saveAdmins(set: Set<string>): void {
  try {
    const dir = path.dirname(adminsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${adminsFilePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(Array.from(set), null, 2), 'utf-8');
    fs.renameSync(tmp, adminsFilePath);
  } catch (err) {
    console.error('Failed to save admins.json:', err);
  }
}

const adminIds = loadAdmins();

function isAdmin(chatId: number | string | undefined): boolean {
  if (!chatId) return false;
  return adminIds.has(chatId.toString());
}

function addAdmin(chatId: number | string): void {
  adminIds.add(chatId.toString());
  saveAdmins(adminIds);
}

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'avalon_coach_2026';
const CHANNEL_ID = Number(process.env.TELEGRAM_CHANNEL_ID) || -1002188408014;
const CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL_USERNAME || 'dusha_avalon';

const bot = new Bot(token);


// Ensure upload directories exist
const rootUploadsDir = path.resolve(import.meta.dir, '..', 'public', 'uploads');
const localUploadsDir = path.resolve(import.meta.dir, 'uploads');
[
  rootUploadsDir,
  localUploadsDir,
  path.join(rootUploadsDir, 'coaches'),
  path.join(rootUploadsDir, 'gallery'),
  path.join(rootUploadsDir, 'announcements'),
  path.join(localUploadsDir, 'coaches'),
  path.join(localUploadsDir, 'gallery'),
  path.join(localUploadsDir, 'announcements')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============ Helper: Download Photo from Telegram ============

async function downloadTelegramPhoto(fileId: string, subfolder: string): Promise<string> {
  const file = await bot.api.getFile(fileId);
  if (!file.file_path) {
    throw new Error('Telegram did not return a file_path');
  }

  const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download photo from Telegram: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = path.extname(file.file_path) || '.jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  // Save to both public/uploads (for Vite dev/build) and server uploads
  const targetPathRoot = path.join(rootUploadsDir, subfolder, filename);
  const targetPathLocal = path.join(localUploadsDir, subfolder, filename);

  fs.writeFileSync(targetPathRoot, buffer);
  try {
    fs.writeFileSync(targetPathLocal, buffer);
  } catch {}

  return `/uploads/${subfolder}/${filename}`;
}

// ============ Helper: Resolve Photo Source for Telegram ============

function resolvePhotoSource(photoPath: string): string | InputFile {
  if (!photoPath) {
    return 'https://avalon.tonivecher.online/images/club/logo_round_512.png';
  }
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  const clean = photoPath.replace(/^\//, '');
  const candidatePaths = [
    path.resolve(import.meta.dir, '..', 'public', clean),
    path.resolve(import.meta.dir, clean),
    path.resolve('/var/www/avalon.tonivecher.online/current', clean),
    path.resolve('/opt/avalon-bot/public', clean),
    path.resolve('/opt/avalon-bot/server', clean),
    path.resolve('/opt/avalon-bot', clean)
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return new InputFile(p);
    }
  }

  return `https://avalon.tonivecher.online/${clean}`;
}

// ============ Conversational State Machine ============

type UserState =
  | { stage: 'idle' }
  // Coach add wizard
  | { stage: 'coach_photo'; draft: Partial<Coach> }
  | { stage: 'coach_name'; draft: Partial<Coach> }
  | { stage: 'coach_role'; draft: Partial<Coach> }
  | { stage: 'coach_badge'; draft: Partial<Coach> }
  | { stage: 'coach_desc'; draft: Partial<Coach> }
  | { stage: 'coach_specs'; draft: Partial<Coach> }
  | { stage: 'coach_confirm'; draft: Coach }
  // Coach edit
  | { stage: 'coach_edit_field'; coachId: string; field: 'photo' | 'name' | 'role' | 'badge' | 'desc' | 'specs' }
  // Announcement wizard
  | { stage: 'ann_title'; draft: Partial<Announcement> }
  | { stage: 'ann_text'; draft: Partial<Announcement> }
  | { stage: 'ann_tag'; draft: Partial<Announcement> }
  | { stage: 'ann_photo'; draft: Partial<Announcement> }
  | { stage: 'ann_confirm'; draft: Announcement }
  // Announcement edit
  | { stage: 'ann_edit_field'; annId: string; field: 'photo' | 'title' | 'text' | 'tag' }
  // Schedule wizard
  | { stage: 'sched_time'; dayKey: number; draft: Partial<ScheduleItem> }
  | { stage: 'sched_title'; dayKey: number; draft: Partial<ScheduleItem> }
  | { stage: 'sched_coach'; dayKey: number; draft: Partial<ScheduleItem> }
  | { stage: 'sched_room'; dayKey: number; draft: Partial<ScheduleItem> }
  | { stage: 'sched_day_note'; dayKey: number }
  // Schedule edit
  | { stage: 'sched_edit_field'; dayKey: number; itemIndex: number; field: 'time' | 'title' | 'coach' | 'room' }
  // Gallery wizard
  | { stage: 'gal_photo'; draft: Partial<GalleryItem> }
  | { stage: 'gal_title'; draft: Partial<GalleryItem> }
  | { stage: 'gal_caption'; draft: Partial<GalleryItem> }
  | { stage: 'gal_badge'; draft: Partial<GalleryItem> }
  | { stage: 'gal_confirm'; draft: GalleryItem }
  // Gallery edit
  | { stage: 'gal_edit_field'; itemId: string; field: 'photo' | 'title' | 'caption' | 'badge' | 'category' }
  // Status wizard
  | { stage: 'status_custom' }
  // AI Preview and Copilot states
  | { stage: 'ai_preview_coach_desc_wizard'; draft: Partial<Coach>; generatedText: string }
  | { stage: 'ai_preview_coach_desc_edit'; coachId: string; generatedText: string }
  | { stage: 'ai_preview_ann_text_wizard'; draft: Partial<Announcement>; generatedText: string }
  | { stage: 'ai_preview_ann_text_edit'; annId: string; generatedText: string }
  | { stage: 'ai_preview_gal_caption_wizard'; draft: Partial<GalleryItem>; generatedText: string }
  | { stage: 'ai_preview_gal_caption_edit'; itemId: string; generatedText: string }
  | { stage: 'ai_free_prompt' }
  | { stage: 'ai_free_preview'; generatedText: string };

const userStates = new Map<number, UserState>();

function getState(userId: number): UserState {
  return userStates.get(userId) || { stage: 'idle' };
}

function setState(userId: number, state: UserState) {
  userStates.set(userId, state);
}

function clearState(userId: number) {
  userStates.delete(userId);
}

function getCancelKeyboard(backCallback: string = 'cancel_action'): InlineKeyboard {
  return new InlineKeyboard()
    .text('❌ Отмена', backCallback)
    .text('🎛️ Главное меню', 'back_main');
}

// ============ Keyboards ============

function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('👨‍🏫 Преподаватели', 'menu_coaches')
    .text('📢 Анонсы и события', 'menu_announcements')
    .row()
    .text('📅 Расписание', 'menu_schedule')
    .text('📸 Фото и галерея', 'menu_gallery')
    .row()
    .text('🏛️ Статус зала', 'menu_status')
    .text('🪄 AI-Копирайтер', 'menu_ai')
    .row()
    .url('🌐 Открыть сайт', 'https://avalon.tonivecher.online');
}


function getCoachesMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Добавить наставника', 'coach_add_start')
    .row()
    .text('📋 Список наставников', 'coach_list')
    .row()
    .text('🔙 Главное меню', 'back_main');
}

function getAnnouncementsMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Опубликовать анонс', 'ann_add_start')
    .row()
    .text('📋 Активные анонсы', 'ann_list')
    .row()
    .text('🔙 Главное меню', 'back_main');
}

function getDaysKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('ПН', 'sched_day_1')
    .text('ВТ', 'sched_day_2')
    .text('СР', 'sched_day_3')
    .text('ЧТ', 'sched_day_4')
    .row()
    .text('ПТ', 'sched_day_5')
    .text('СБ', 'sched_day_6')
    .text('ВС', 'sched_day_0')
    .row()
    .text('🔙 Главное меню', 'back_main');
}

function getGalleryMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('➕ Добавить фото в галерею', 'gal_add_start')
    .row()
    .text('📋 Список фотографий', 'gal_list')
    .row()
    .text('🔙 Главное меню', 'back_main');
}

function getCoachPostEditKeyboard(coachId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Редактировать еще', `coach_edit_${coachId}`)
    .row()
    .text('📋 К списку наставников', 'coach_list')
    .text('🎛️ Главное меню', 'back_main');
}

function getAnnouncementPostEditKeyboard(annId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('📢 В канал @dusha_avalon', `ann_broadcast_${annId}`)
    .row()
    .text('✏️ Редактировать еще', `ann_edit_${annId}`)
    .row()
    .text('📢 Ко всем анонсам', 'ann_list')
    .text('🎛️ Главное меню', 'back_main');
}


function getSchedulePostEditKeyboard(dayKey: number, itemIndex: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Редактировать еще', `sched_edit_item_${dayKey}_${itemIndex}`)
    .row()
    .text('📅 К расписанию дня', `sched_day_${dayKey}`)
    .text('🎛️ Главное меню', 'back_main');
}

function getGalleryPostEditKeyboard(itemId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Редактировать еще', `gal_edit_${itemId}`)
    .row()
    .text('📸 Ко всей галерее', 'gal_list')
    .text('🎛️ Главное меню', 'back_main');
}

function getStatusPostEditKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🏛️ В меню статуса зала', 'menu_status')
    .row()
    .text('🎛️ Главное меню', 'back_main');
}


// Разрешаем команды /start и /auth, а также посты из канала без авторизации
bot.use(async (ctx, next) => {
  if (ctx.channelPost || ctx.editedChannelPost) {
    return next();
  }

  const text = ctx.message?.text || '';
  if (text.startsWith('/start') || text.startsWith('/auth')) {
    return next();
  }


  // Check admin rights
  const chatId = ctx.chat?.id;
  if (!isAdmin(chatId)) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: '⛔ Доступ только для наставников ТСК «Авалон»',
        show_alert: true
      });
      return;
    }

    await ctx.reply(
      '⛔ *Доступ ограничен*\n\n' +
      'Этот бот предназначен для тренеров и администрации ТСК «Авалон».\n\n' +
      'Если вам выдан ключ наставника, отправьте команду:\n' +
      '`/auth ВАШ_КЛЮЧ`\n\n' +
      'Сайт клуба: https://avalon.tonivecher.online\n' +
      'Канал клуба: @dusha_avalon',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  return next();
});

// ============ Bot Commands ============

bot.command('auth', async (ctx) => {
  const text = ctx.message?.text || '';
  const parts = text.trim().split(/\s+/);
  const code = parts[1];

  if (!code) {
    await ctx.reply(
      'Для авторизации тренера укажите ключ доступа:\n`/auth ВАШ_КЛЮЧ`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (code.trim() === ADMIN_SECRET) {
    addAdmin(ctx.chat.id);
    clearState(ctx.chat.id);
    await ctx.reply(
      '✅ *Вы успешно авторизованы как наставник ТСК «Авалон»!*\n\n' +
      'Вам открыт доступ к панели управления сайтом.',
      {
        reply_markup: getMainMenuKeyboard(),
        parse_mode: 'Markdown'
      }
    );
  } else {
    await ctx.reply(
      '⛔ *Неверный ключ доступа.*\nУточните действующий ключ у главного тренера клуба.',
      { parse_mode: 'Markdown' }
    );
  }
});

bot.command('start', async (ctx) => {
  clearState(ctx.chat.id);
  const chatId = ctx.chat.id;

  if (isAdmin(chatId)) {
    await ctx.reply(
      `👋 *Панель управления ТСК «Авалон»*\n\n` +
      `Здесь вы можете в реальном времени редактировать контент сайта avalon.tonivecher.online:\n` +
      `• Добавлять и изменять преподавателей и их портреты\n` +
      `• Публиковать анонсы и важные события\n` +
      `• Редактировать сетку расписания по дням недели\n` +
      `• Загружать фотографии побед и тренировок в галерею\n` +
      `• Менять оперативный статус зала\n\n` +
      `Выберите раздел для управления:`,
      { reply_markup: getMainMenuKeyboard(), parse_mode: 'Markdown' }
    );
  } else {
    const visitorKeyboard = new InlineKeyboard()
      .url('🌐 Перейти на сайт клуба', 'https://avalon.tonivecher.online')
      .row()
      .url('📢 Канал клуба @dusha_avalon', 'https://t.me/dusha_avalon');

    await ctx.reply(
      `👋 *ТСК «Авалон» (Усадьба Свиблово)*\n\n` +
      `Школа спортивного бального танца для детей и юниоров под руководством Анны Турчиной.\n\n` +
      `• Расписание тренировок, педагогический состав и запись на бесплатный пробный урок:\n` +
      `https://avalon.tonivecher.online\n\n` +
      `• Результаты турниров, расписание сборов и жизнь клуба в Telegram:\n` +
      `https://t.me/dusha_avalon\n\n` +
      `_Этот бот предназначен для тренеров клуба. Если вы наставник ТСК «Авалон», отправьте команду:_ \`/auth ВАШ_КЛЮЧ\``,
      {
        reply_markup: visitorKeyboard,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      }
    );
  }
});

bot.command('menu', async (ctx) => {
  clearState(ctx.chat.id);
  await ctx.reply('🎛️ *Главная панель CMS ТСК «Авалон»:*', {
    reply_markup: getMainMenuKeyboard(),
    parse_mode: 'Markdown'
  });
});

bot.command('cancel', async (ctx) => {
  clearState(ctx.chat.id);
  await ctx.reply('Действие отменено. Возврат в главное меню.', {
    reply_markup: getMainMenuKeyboard()
  });
});

// ============ Navigation Callbacks ============

bot.callbackQuery('back_main', async (ctx) => {
  clearState(ctx.chat?.id || 0);
  await ctx.answerCallbackQuery();
  await ctx.reply('🎛️ *Главная панель управления сайтом:*', {
    reply_markup: getMainMenuKeyboard(),
    parse_mode: 'Markdown'
  });
});

bot.callbackQuery('cancel_action', async (ctx) => {
  clearState(ctx.chat?.id || 0);
  await ctx.answerCallbackQuery('Отменено');
  await ctx.reply('Действие отменено.', { reply_markup: getMainMenuKeyboard() });
});

// ==========================================
// 1. SECTION: COACHES
// ==========================================

bot.callbackQuery('menu_coaches', async (ctx) => {
  await ctx.answerCallbackQuery();
  const coaches = getCoaches();
  await ctx.reply(
    `👨‍🏫 *Раздел «Преподаватели и наставники»*\n\n` +
    `Всего наставников на сайте: *${coaches.length}*\n\n` +
    `Вы можете добавить нового наставника с портретным фото или отредактировать существующих.`,
    { reply_markup: getCoachesMenuKeyboard(), parse_mode: 'Markdown' }
  );
});

async function sendCoachCard(ctx: any, coach: Coach, customKb?: InlineKeyboard) {
  const kb = customKb || new InlineKeyboard()
    .text('✏️ Редактировать', `coach_edit_${coach.id}`)
    .text('🗑️ Удалить', `coach_del_${coach.id}`);

  const caption =
    `👤 *${coach.name}*\n` +
    `🎗️ ${coach.badge} | ${coach.role}\n\n` +
    `📝 ${coach.desc}\n\n` +
    `🏷️ *Направления:* ${coach.specs.join(', ')}`;

  const photoSource = resolvePhotoSource(coach.photo);
  try {
    await ctx.replyWithPhoto(photoSource, {
      caption,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
  } catch (err) {
    console.error(`Failed to send coach photo for ${coach.name}:`, err);
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: kb
    });
  }
}

bot.callbackQuery('coach_list', async (ctx) => {
  await ctx.answerCallbackQuery();
  const coaches = getCoaches();

  if (coaches.length === 0) {
    const kb = new InlineKeyboard()
      .text('➕ Добавить наставника', 'coach_add_start')
      .row()
      .text('🔙 В меню раздела', 'menu_coaches')
      .text('🎛️ Главное меню', 'back_main');
    await ctx.reply('На сайте пока нет преподавателей.', { reply_markup: kb });
    return;
  }

  await ctx.reply(`📋 *Список наставников ТСК «Авалон» (${coaches.length}):*`, {
    parse_mode: 'Markdown'
  });

  for (const coach of coaches) {
    await sendCoachCard(ctx, coach);
  }

  const bottomKb = new InlineKeyboard()
    .text('➕ Добавить еще наставника', 'coach_add_start')
    .row()
    .text('🔙 В меню раздела', 'menu_coaches')
    .text('🎛️ Главное меню', 'back_main');
  await ctx.reply('Управление списком преподавателей:', { reply_markup: bottomKb });
});

bot.callbackQuery(/^coach_edit_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coachId = ctx.match[1];
  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) {
    await ctx.reply('Преподаватель не найден.', { reply_markup: getCoachesMenuKeyboard() });
    return;
  }

  const kb = new InlineKeyboard()
    .text('🖼️ Сменить фото', `coach_ed_${coach.id}_photo`)
    .text('👤 Изменить ФИО', `coach_ed_${coach.id}_name`)
    .row()
    .text('🎓 Изменить роль/должность', `coach_ed_${coach.id}_role`)
    .row()
    .text('🎗️ Изменить бейдж (регалии)', `coach_ed_${coach.id}_badge`)
    .row()
    .text('📝 Изменить описание', `coach_ed_${coach.id}_desc`)
    .row()
    .text('🏷️ Изменить направления', `coach_ed_${coach.id}_specs`)
    .row()
    .text('🗑️ Удалить наставника', `coach_del_${coach.id}`)
    .row()
    .text('📋 К списку наставников', 'coach_list')
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `✏️ *Редактирование наставника:*\n` +
    `👤 *${coach.name}* (${coach.role})\n\n` +
    `Выберите поле для изменения:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery(/^coach_ed_(.+)_(photo|name|role|badge|desc|specs)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coachId = ctx.match[1];
  const field = ctx.match[2] as 'photo' | 'name' | 'role' | 'badge' | 'desc' | 'specs';
  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) return;

  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'coach_edit_field', coachId, field });

  if (field === 'desc') {
    const aiKb = new InlineKeyboard()
      .text('🪄 Новое описание (AI)', `coach_ai_new_${coach.id}`)
      .text('✨ Улучшить текущее (AI)', `coach_ai_imp_${coach.id}`)
      .row()
      .text('✏️ Написать вручную', `coach_ed_${coach.id}_desc_manual`)
      .row()
      .text('❌ Отмена', `coach_edit_${coach.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Редактирование описания наставника*\n` +
      `👤 *${coach.name}* (${coach.role})\n\n` +
      `Текущее описание на сайте:\n` +
      `_${coach.desc || 'Не заполнено'}_\n\n` +
      `_Вы можете отправить новый текст сообщением в чат или воспользоваться AI-генератором Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: aiKb }
    );
    return;
  }

  const cancelKb = getCancelKeyboard(`coach_edit_${coach.id}`);

  const prompts: Record<string, string> = {
    photo: `📸 Отправьте *новое фото* для преподавателя *${coach.name}* в чат (вертикальный портрет):\n_Поддерживаются обычные фото и файлы без сжатия._`,
    name: `👤 Текущее ФИО: *${coach.name}*\n\nВведите новое имя и фамилию:`,
    role: `🎓 Текущая роль: *${coach.role}*\n\nВведите новую должность/роль:`,
    badge: `🎗️ Текущий бейдж: *${coach.badge}*\n\nВведите новый бейдж (регалии):`,
    desc: `📝 Текущее описание:\n_${coach.desc}_\n\nВведите новое подробное описание:`,
    specs: `🏷️ Текущие направления:\n*${coach.specs.join(', ')}*\n\nВведите новые направления через запятую:`
  };

  await ctx.reply(prompts[field], { parse_mode: 'Markdown', reply_markup: cancelKb });
});

// Coach AI Handlers
bot.callbackQuery(/^coach_ai_new_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую описание...');
  const coachId = ctx.match[1];
  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) return;

  const waitMsg = await ctx.reply('⏳ *Gemini составляет описание наставника...*', { parse_mode: 'Markdown' });
  try {
    const generated = await generateCoachBio({
      name: coach.name,
      role: coach.role,
      badge: coach.badge,
      specs: coach.specs
    });

    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_coach_desc_edit', coachId: coach.id, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `coach_ai_apply_${coach.id}`)
      .text('🔄 Другой вариант', `coach_ai_new_${coach.id}`)
      .row()
      .text('✏️ Написать вручную', `coach_ed_${coach.id}_desc_manual`)
      .row()
      .text('❌ Отмена', `coach_edit_${coach.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Новый вариант описания для ${coach.name}:*\n\n` +
      `«${generated}»\n\n` +
      `_Применить на сайте или сгенерировать заново? Вы также можете отправить свой вариант сообщением в чат:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите описание вручную:`, {
      reply_markup: getCancelKeyboard(`coach_edit_${coach.id}`)
    });
  }
});

bot.callbackQuery(/^coach_ai_imp_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Улучшаю текст...');
  const coachId = ctx.match[1];
  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) return;

  const waitMsg = await ctx.reply('⏳ *Gemini улучшает стиль описания...*', { parse_mode: 'Markdown' });
  try {
    const improved = await improveCoachBio(coach.desc || coach.role, coach.name);

    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_coach_desc_edit', coachId: coach.id, generatedText: improved });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `coach_ai_apply_${coach.id}`)
      .text('🔄 Попробовать еще раз', `coach_ai_imp_${coach.id}`)
      .row()
      .text('✏️ Написать вручную', `coach_ed_${coach.id}_desc_manual`)
      .row()
      .text('❌ Отмена', `coach_edit_${coach.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `✨ *Улучшенный вариант описания для ${coach.name}:*\n\n` +
      `«${improved}»\n\n` +
      `_Применить на сайте или попробовать еще раз?_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка улучшения: ${err.message}\nВведите описание вручную:`, {
      reply_markup: getCancelKeyboard(`coach_edit_${coach.id}`)
    });
  }
});

bot.callbackQuery(/^coach_ai_apply_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Сохранено!');
  const coachId = ctx.match[1];
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_coach_desc_edit' || state.coachId !== coachId) return;

  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) return;

  coach.desc = state.generatedText;
  saveCoach(coach);
  clearState(userId);

  await ctx.reply(`✅ Новое описание наставника *${coach.name}* сохранено и опубликовано на сайте!`, {
    parse_mode: 'Markdown'
  });
  await sendCoachCard(ctx, coach, getCoachPostEditKeyboard(coach.id));
});

bot.callbackQuery(/^coach_ed_(.+)_desc_manual$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coachId = ctx.match[1];
  const coach = getCoaches().find(c => c.id === coachId);
  if (!coach) return;
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'coach_edit_field', coachId, field: 'desc' });
  await ctx.reply(`📝 Отправьте новый текст описания для *${coach.name}* сообщением в чат:`, {
    parse_mode: 'Markdown',
    reply_markup: getCancelKeyboard(`coach_edit_${coach.id}`)
  });
});

// Coach wizard AI callbacks
bot.callbackQuery('coach_ai_gen_desc', async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую описание...');
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'coach_desc' && state.stage !== 'ai_preview_coach_desc_wizard') return;

  const waitMsg = await ctx.reply('⏳ *Gemini составляет описание наставника...*', { parse_mode: 'Markdown' });
  try {
    const draft = state.draft;
    const generated = await generateCoachBio({
      name: draft.name || 'Преподаватель',
      role: draft.role,
      badge: draft.badge
    });

    setState(userId, { stage: 'ai_preview_coach_desc_wizard', draft, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Использовать этот текст', 'coach_ai_accept_desc')
      .text('🔄 Другой вариант', 'coach_ai_gen_desc')
      .row()
      .text('✏️ Написать вручную', 'coach_ai_manual_desc')
      .row()
      .text('❌ Отмена', 'coach_list')
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Сгенерированное описание для «${draft.name}»:*\n\n` +
      `«${generated}»\n\n` +
      `_Нажмите «✅ Использовать этот текст» для перехода к направлениям, либо отправьте свой текст сообщением:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите описание вручную:`, {
      reply_markup: getCancelKeyboard('coach_list')
    });
  }
});

bot.callbackQuery('coach_ai_accept_desc', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_coach_desc_wizard') return;

  state.draft.desc = state.generatedText;
  setState(userId, { stage: 'coach_specs', draft: state.draft });

  await ctx.reply(
    `🏷️ *Шаг 6 из 6: Ключевые теги*\n\n` +
    `Введите направления через запятую (например: *Начальная подготовка, Балет, Постановка пар, Прогоны*):`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('coach_list') }
  );
});

bot.callbackQuery('coach_ai_manual_desc', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage === 'ai_preview_coach_desc_wizard') {
    setState(userId, { stage: 'coach_desc', draft: state.draft });
  }
  await ctx.reply('Введите текст описания наставника сообщением в чат:', {
    reply_markup: getCancelKeyboard('coach_list')
  });
});


bot.callbackQuery(/^coach_del_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coachId = ctx.match[1];
  if (!coachId) return;
  const coach = getCoaches().find(c => c.id === coachId);
  const name = coach?.name || 'Преподаватель';

  const confirmKb = new InlineKeyboard()
    .text('💥 Да, удалить с сайта', `coach_del_confirm_${coachId}`)
    .row()
    .text('❌ Отмена', `coach_edit_${coachId}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `⚠️ *Подтверждение удаления*\n\n` +
    `Вы действительно хотите удалить наставника *«${name}»* с сайта?`,
    { parse_mode: 'Markdown', reply_markup: confirmKb }
  );
});

bot.callbackQuery(/^coach_del_confirm_(.+)$/, async (ctx) => {
  const coachId = ctx.match[1];
  if (!coachId) return;
  const coach = getCoaches().find(c => c.id === coachId);
  const name = coach?.name || 'Преподаватель';

  deleteCoach(coachId);
  await ctx.answerCallbackQuery('Удалено!');
  await ctx.reply(`✅ Преподаватель *«${name}»* удален с сайта.`, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('📋 К списку наставников', 'coach_list')
      .text('🎛️ Главное меню', 'back_main')
  });
});

bot.callbackQuery('coach_add_start', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'coach_photo', draft: {} });

  const skipKb = new InlineKeyboard()
    .text('➡️ Без фото (дефолтное)', 'coach_skip_photo')
    .row()
    .text('❌ Отмена', 'cancel_action');

  await ctx.reply(
    `📸 *Шаг 1 из 6: Портретное фото наставника*\n\n` +
    `Отправьте вертикальное фото преподавателя в чат.\n` +
    `_Бот сохранит исходное качество и сразу опубликует на сайте._`,
    { parse_mode: 'Markdown', reply_markup: skipKb }
  );
});

bot.callbackQuery('coach_skip_photo', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage === 'coach_photo') {
    state.draft.photo = '/images/club/channel_avatar.jpg';
    setState(userId, { stage: 'coach_name', draft: state.draft });
    await ctx.reply(
      `✍️ *Шаг 2 из 6: ФИО наставника*\n\nВведите имя и фамилию преподавателя (например: *Анна Турчина*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard() }
    );
  }
});

// ==========================================
// 2. SECTION: ANNOUNCEMENTS
// ==========================================

bot.callbackQuery('menu_announcements', async (ctx) => {
  await ctx.answerCallbackQuery();
  const announcements = getAnnouncements();
  await ctx.reply(
    `📢 *Раздел «Анонсы и события»*\n\n` +
    `Активных анонсов на сайте: *${announcements.length}*\n\n` +
    `Анонсы показываются на сайте в виде плашки и верхних баннеров.`,
    { reply_markup: getAnnouncementsMenuKeyboard(), parse_mode: 'Markdown' }
  );
});

async function sendAnnouncementCard(ctx: any, ann: Announcement, customKb?: InlineKeyboard) {
  const kb = customKb || new InlineKeyboard()
    .text('📢 В канал', `ann_broadcast_${ann.id}`)
    .text('✏️ Редактировать', `ann_edit_${ann.id}`)
    .row()
    .text('🗑️ Удалить', `ann_del_${ann.id}`);


  const caption =
    `📢 *${ann.title}*\n` +
    `🏷️ Плашка: ${ann.tag} | 📅 Дата: ${ann.date}\n\n` +
    `${ann.text}`;

  if (ann.photo) {
    const photoSource = resolvePhotoSource(ann.photo);
    try {
      await ctx.replyWithPhoto(photoSource, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: kb
      });
      return;
    } catch (err) {
      console.error(`Failed to send ann photo for ${ann.title}:`, err);
    }
  }

  await ctx.reply(caption, {
    parse_mode: 'Markdown',
    reply_markup: kb
  });
}

bot.callbackQuery('ann_list', async (ctx) => {
  await ctx.answerCallbackQuery();
  const announcements = getAnnouncements();

  if (announcements.length === 0) {
    const kb = new InlineKeyboard()
      .text('➕ Создать анонс', 'ann_add_start')
      .row()
      .text('🔙 В меню анонсов', 'menu_announcements')
      .text('🎛️ Главное меню', 'back_main');
    await ctx.reply('Активных анонсов на сайте сейчас нет.', { reply_markup: kb });
    return;
  }

  await ctx.reply(`📢 *Активные анонсы клуба (${announcements.length}):*`, {
    parse_mode: 'Markdown'
  });

  for (const ann of announcements) {
    await sendAnnouncementCard(ctx, ann);
  }

  const bottomKb = new InlineKeyboard()
    .text('➕ Добавить еще анонс', 'ann_add_start')
    .row()
    .text('🔙 В меню раздела', 'menu_announcements')
    .text('🎛️ Главное меню', 'back_main');
  await ctx.reply('Управление анонсами:', { reply_markup: bottomKb });
});

bot.callbackQuery(/^ann_edit_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const annId = ctx.match[1];
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) {
    await ctx.reply('Анонс не найден.', { reply_markup: getAnnouncementsMenuKeyboard() });
    return;
  }

  const kb = new InlineKeyboard()
    .text('📌 Заголовок', `ann_ed_${ann.id}_title`)
    .text('🏷️ Тег / плашка', `ann_ed_${ann.id}_tag`)
    .row()
    .text('📝 Текст анонса', `ann_ed_${ann.id}_text`)
    .text('🖼️ Фото / афиша', `ann_ed_${ann.id}_photo`)
    .row()
    .text('🗑️ Удалить анонс', `ann_del_${ann.id}`)
    .row()
    .text('📋 Ко всем анонсам', 'ann_list')
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `✏️ *Редактирование анонса:*\n` +
    `📢 *${ann.title}*\n\n` +
    `Выберите поле для изменения:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery(/^ann_ed_(.+)_(title|tag|text|photo)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const annId = ctx.match[1];
  const field = ctx.match[2] as 'title' | 'tag' | 'text' | 'photo';
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) return;

  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'ann_edit_field', annId, field });

  if (field === 'text') {
    const aiKb = new InlineKeyboard()
      .text('🪄 Написать заново (AI)', `ann_ai_new_${ann.id}`)
      .text('✨ Улучшить текст (AI)', `ann_ai_imp_${ann.id}`)
      .row()
      .text('✏️ Написать вручную', `ann_ed_${ann.id}_text_manual`)
      .row()
      .text('❌ Отмена', `ann_edit_${ann.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Редактирование текста анонса*\n` +
      `📢 *«${ann.title}»*\n\n` +
      `Текущий текст анонса:\n` +
      `_${ann.text || 'Не заполнено'}_\n\n` +
      `_Вы можете отправить новый текст сообщением в чат или воспользоваться генерацией через Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: aiKb }
    );
    return;
  }

  const cancelKb = getCancelKeyboard(`ann_edit_${ann.id}`);

  const prompts: Record<string, string> = {
    title: `📌 Текущий заголовок: *${ann.title}*\n\nВведите новый заголовок анонса:`,
    tag: `🏷️ Текущая плашка: *${ann.tag}*\n\nВведите новое название плашки (например: *Набор 2026*, *Мастер-класс*):`,
    text: `📝 Текущий текст:\n${ann.text}\n\nВведите новый текст анонса:`,
    photo: `📸 Отправьте *новую афишу или фото* для анонса в чат:\n_Поддерживаются обычные фото и файлы без сжатия._`
  };

  await ctx.reply(prompts[field], { parse_mode: 'Markdown', reply_markup: cancelKb });
});

// Announcement AI Handlers
bot.callbackQuery(/^ann_ai_new_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую анонс...');
  const annId = ctx.match[1];
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) return;

  const waitMsg = await ctx.reply('⏳ *Gemini пишет текст анонса...*', { parse_mode: 'Markdown' });
  try {
    const generated = await generateAnnouncementText(ann.title, ann.tag);
    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_ann_text_edit', annId: ann.id, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `ann_ai_apply_${ann.id}`)
      .text('🔄 Другой вариант', `ann_ai_new_${ann.id}`)
      .row()
      .text('✏️ Написать вручную', `ann_ed_${ann.id}_text_manual`)
      .row()
      .text('❌ Отмена', `ann_edit_${ann.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Новый текст анонса «${ann.title}»:*\n\n` +
      `«${generated}»\n\n` +
      `_Применить на сайте или сгенерировать заново? Либо отправьте свой вариант сообщением:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите текст вручную:`, {
      reply_markup: getCancelKeyboard(`ann_edit_${ann.id}`)
    });
  }
});

bot.callbackQuery(/^ann_ai_imp_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Улучшаю анонс...');
  const annId = ctx.match[1];
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) return;

  const waitMsg = await ctx.reply('⏳ *Gemini улучшает структуру и стиль...*', { parse_mode: 'Markdown' });
  try {
    const improved = await improveAnnouncementText(ann.text, ann.title);
    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_ann_text_edit', annId: ann.id, generatedText: improved });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `ann_ai_apply_${ann.id}`)
      .text('🔄 Попробовать еще раз', `ann_ai_imp_${ann.id}`)
      .row()
      .text('✏️ Написать вручную', `ann_ed_${ann.id}_text_manual`)
      .row()
      .text('❌ Отмена', `ann_edit_${ann.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `✨ *Улучшенный текст анонса «${ann.title}»:*\n\n` +
      `«${improved}»\n\n` +
      `_Применить на сайте или попробовать еще раз?_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка улучшения: ${err.message}\nВведите текст вручную:`, {
      reply_markup: getCancelKeyboard(`ann_edit_${ann.id}`)
    });
  }
});

bot.callbackQuery(/^ann_ai_apply_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Сохранено!');
  const annId = ctx.match[1];
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_ann_text_edit' || state.annId !== annId) return;

  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) return;

  ann.text = state.generatedText;
  saveAnnouncement(ann);
  clearState(userId);

  await ctx.reply(`✅ Текст анонса *«${ann.title}»* обновлен и опубликован на сайте!`, {
    parse_mode: 'Markdown'
  });
  await sendAnnouncementCard(ctx, ann, getAnnouncementPostEditKeyboard(ann.id));
});

bot.callbackQuery(/^ann_ed_(.+)_text_manual$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const annId = ctx.match[1];
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) return;
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'ann_edit_field', annId, field: 'text' });
  await ctx.reply(`📝 Отправьте новый текст анонса для *«${ann.title}»* сообщением в чат:`, {
    parse_mode: 'Markdown',
    reply_markup: getCancelKeyboard(`ann_edit_${ann.id}`)
  });
});

// Announcement wizard AI callbacks
bot.callbackQuery('ann_ai_gen_text', async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую текст...');
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ann_text' && state.stage !== 'ai_preview_ann_text_wizard') return;

  const waitMsg = await ctx.reply('⏳ *Gemini пишет текст анонса...*', { parse_mode: 'Markdown' });
  try {
    const draft = state.draft;
    const generated = await generateAnnouncementText(draft.title || 'Событие клуба');

    setState(userId, { stage: 'ai_preview_ann_text_wizard', draft, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Использовать этот текст', 'ann_ai_accept_text')
      .text('🔄 Другой вариант', 'ann_ai_gen_text')
      .row()
      .text('✏️ Написать вручную', 'ann_ai_manual_text')
      .row()
      .text('❌ Отмена', 'ann_list')
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Сгенерированный анонс для «${draft.title}»:*\n\n` +
      `«${generated}»\n\n` +
      `_Нажмите «✅ Использовать этот текст» для перехода к плашке, либо отправьте свой текст сообщением:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите текст анонса вручную:`, {
      reply_markup: getCancelKeyboard('ann_list')
    });
  }
});

bot.callbackQuery('ann_ai_accept_text', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_ann_text_wizard') return;

  state.draft.text = state.generatedText;
  setState(userId, { stage: 'ann_tag', draft: state.draft });

  await ctx.reply(
    `🏷️ *Шаг 3 из 3: Плашка / Категория*\n\n` +
    `Введите название плашки (например: *Мастер-класс*, *Турнир*, *Набор 2026*, *Сборы*):`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('ann_list') }
  );
});

bot.callbackQuery('ann_ai_manual_text', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage === 'ai_preview_ann_text_wizard') {
    setState(userId, { stage: 'ann_text', draft: state.draft });
  }
  await ctx.reply('Введите текст анонса сообщением в чат:', {
    reply_markup: getCancelKeyboard('ann_list')
  });
});


bot.callbackQuery(/^ann_del_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const annId = ctx.match[1];
  if (!annId) return;
  const ann = getAnnouncements().find(a => a.id === annId);
  const title = ann?.title || 'Анонс';

  const confirmKb = new InlineKeyboard()
    .text('💥 Да, удалить с сайта', `ann_del_confirm_${annId}`)
    .row()
    .text('❌ Отмена', `ann_edit_${annId}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `⚠️ *Подтверждение удаления анонса*\n\n` +
    `Вы уверены, что хотите удалить анонс *«${title}»* с сайта?`,
    { parse_mode: 'Markdown', reply_markup: confirmKb }
  );
});

bot.callbackQuery(/^ann_del_confirm_(.+)$/, async (ctx) => {
  const annId = ctx.match[1];
  if (!annId) return;
  deleteAnnouncement(annId);
  await ctx.answerCallbackQuery('Анонс удален');
  await ctx.reply('✅ Анонс успешно удален с сайта.', {
    reply_markup: new InlineKeyboard()
      .text('📋 Ко всем анонсам', 'ann_list')
      .text('🎛️ Главное меню', 'back_main')
  });
});

bot.callbackQuery('ann_add_start', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'ann_title', draft: {} });

  await ctx.reply(
    `📢 *Шаг 1 из 3: Заголовок анонса*\n\n` +
    `Введите краткий и понятный заголовок (например: *Открытый мастер-класс по латине* или *Новый набор детей от 4 лет*):`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard() }
  );
});

// ==========================================
// 3. SECTION: SCHEDULE
// ==========================================

bot.callbackQuery('menu_schedule', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `📅 *Сетка расписания ТСК «Авалон»*\n\n` +
    `Выберите день недели для просмотра и редактирования тренировок:`,
    { reply_markup: getDaysKeyboard(), parse_mode: 'Markdown' }
  );
});

bot.callbackQuery(/^sched_day_([0-6])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const schedule = getSchedule();
  const dayData = schedule[dayKey];

  if (!dayData) {
    await ctx.reply('Данные для этого дня отсутствуют.', { reply_markup: getDaysKeyboard() });
    return;
  }

  let text = `📅 *Расписание на ${dayData.dayName.toUpperCase()} (${dayData.shortName})*\n\n`;
  if (dayData.announcement) {
    text += `⚠️ *Объявление дня:* _${dayData.announcement}_\n\n`;
  }

  if (dayData.items.length === 0) {
    text += `В этот день занятий не запланировано.\n`;
  } else {
    dayData.items.forEach((item, idx) => {
      text += `*${idx + 1}.* 🕒 \`${item.time}\`\n   *${item.title}*\n   👤 Тренер: ${item.coach} | 🏛️ Зал: ${item.room}\n\n`;
    });
  }

  const kb = new InlineKeyboard()
    .text('➕ Добавить занятие', `sched_add_${dayKey}`)
    .text('💬 Объявление дня', `sched_note_${dayKey}`)
    .row();

  if (dayData.items.length > 0) {
    kb.text('✏️ Редактировать занятие', `sched_edit_menu_${dayKey}`)
      .text('🗑️ Удалить занятие', `sched_del_menu_${dayKey}`)
      .row();
  }

  kb.text('🔙 К выбору дня', 'menu_schedule')
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
});

bot.callbackQuery(/^sched_edit_menu_([0-6])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const schedule = getSchedule();
  const dayData = schedule[dayKey];

  if (!dayData || dayData.items.length === 0) {
    await ctx.reply('Нет занятий для редактирования.', { reply_markup: getDaysKeyboard() });
    return;
  }

  const kb = new InlineKeyboard();
  dayData.items.forEach((item, idx) => {
    kb.text(`✏️ ${idx + 1}. ${item.time} — ${item.title.substring(0, 18)}...`, `sched_edit_item_${dayKey}_${idx}`).row();
  });
  kb.text('🔙 Назад к расписанию дня', `sched_day_${dayKey}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(`✏️ *Выберите занятие для редактирования (${dayData.dayName}):*`, {
    parse_mode: 'Markdown',
    reply_markup: kb
  });
});

bot.callbackQuery(/^sched_edit_item_([0-6])_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const idx = Number(ctx.match[2]);
  const schedule = getSchedule();
  const item = schedule[dayKey]?.items[idx];

  if (!item) {
    await ctx.reply('Занятие не найдено.', { reply_markup: getDaysKeyboard() });
    return;
  }

  const kb = new InlineKeyboard()
    .text('🕒 Время', `sched_field_${dayKey}_${idx}_time`)
    .text('🏷️ Название группы', `sched_field_${dayKey}_${idx}_title`)
    .row()
    .text('👤 Преподаватель', `sched_field_${dayKey}_${idx}_coach`)
    .text('🏛️ Аудитория / зал', `sched_field_${dayKey}_${idx}_room`)
    .row()
    .text('🎯 Категория', `sched_field_${dayKey}_${idx}_category`)
    .text('🗑️ Удалить', `sched_ask_del_${dayKey}_${idx}`)
    .row()
    .text('📅 К расписанию дня', `sched_day_${dayKey}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `✏️ *Редактирование занятия #${idx + 1}:*\n\n` +
    `🕒 *Время:* \`${item.time}\`\n` +
    `📌 *Название:* ${item.title}\n` +
    `👤 *Тренер:* ${item.coach}\n` +
    `🏛️ *Зал:* ${item.room}\n` +
    `🎯 *Категория:* ${item.category}\n\n` +
    `Выберите поле для изменения:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery(/^sched_field_([0-6])_(\d+)_category$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const idx = Number(ctx.match[2]);

  const kb = new InlineKeyboard()
    .text('👶 Школа танца (4–7)', `sched_set_cat_${dayKey}_${idx}_kids`)
    .text('🥈 Средняя / конкурсная', `sched_set_cat_${dayKey}_${idx}_junior`)
    .row()
    .text('🏆 PRO и старшие', `sched_set_cat_${dayKey}_${idx}_pro`)
    .text('🩰 Хореография, ОФП', `sched_set_cat_${dayKey}_${idx}_choreo`)
    .row()
    .text('🔙 Назад', `sched_edit_item_${dayKey}_${idx}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply('Выберите новую категорию направления:', { reply_markup: kb });
});

bot.callbackQuery(/^sched_set_cat_([0-6])_(\d+)_(kids|junior|pro|choreo)$/, async (ctx) => {
  const dayKey = Number(ctx.match[1]);
  const idx = Number(ctx.match[2]);
  const cat = ctx.match[3] as 'kids' | 'junior' | 'pro' | 'choreo';

  const schedule = getSchedule();
  const item = schedule[dayKey]?.items[idx];
  if (item) {
    item.category = cat;
    saveScheduleItem(dayKey, item, idx);
    await ctx.answerCallbackQuery('Категория обновлена');
    await ctx.reply(`✅ Категория занятия #${idx + 1} обновлена на *${cat}*!`, {
      parse_mode: 'Markdown',
      reply_markup: getSchedulePostEditKeyboard(dayKey, idx)
    });
  }
});

bot.callbackQuery(/^sched_field_([0-6])_(\d+)_(time|title|coach|room)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const idx = Number(ctx.match[2]);
  const field = ctx.match[3] as 'time' | 'title' | 'coach' | 'room';
  const schedule = getSchedule();
  const item = schedule[dayKey]?.items[idx];
  if (!item) return;

  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'sched_edit_field', dayKey, itemIndex: idx, field });

  const cancelKb = getCancelKeyboard(`sched_edit_item_${dayKey}_${idx}`);

  const prompts: Record<string, string> = {
    time: `🕒 Текущее время: \`${item.time}\`\n\nВведите новое время (например: \`18:00 – 19:30\`):`,
    title: `📌 Текущее название: *${item.title}*\n\nВведите новое название группы:`,
    coach: `👤 Текущий тренер: *${item.coach}*\n\nВведите имя преподавателя:`,
    room: `🏛️ Текущий зал: *${item.room}*\n\nВведите зал проведения:`
  };

  await ctx.reply(prompts[field], { parse_mode: 'Markdown', reply_markup: cancelKb });
});

bot.callbackQuery(/^sched_note_([0-6])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'sched_day_note', dayKey });

  const clearKb = new InlineKeyboard()
    .text('🧹 Очистить объявление', `sched_clear_note_${dayKey}`)
    .row()
    .text('❌ Отмена', `sched_day_${dayKey}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `💬 *Объявление для выбранного дня:*\n\n` +
    `Введите текст примечания (например: *Индивидуальные уроки, постановка конкурсных вариаций*).\n` +
    `Текст будет выделен желтой плашкой над расписанием.`,
    { parse_mode: 'Markdown', reply_markup: clearKb }
  );
});

bot.callbackQuery(/^sched_clear_note_([0-6])$/, async (ctx) => {
  const dayKey = Number(ctx.match[1]);
  saveDayAnnouncement(dayKey, '');
  await ctx.answerCallbackQuery('Объявление очищено');
  await ctx.reply('✅ Объявление дня очищено.', {
    reply_markup: new InlineKeyboard()
      .text('📅 К расписанию дня', `sched_day_${dayKey}`)
      .text('🎛️ Главное меню', 'back_main')
  });
});

bot.callbackQuery(/^sched_add_([0-6])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'sched_time', dayKey, draft: {} });

  await ctx.reply(
    `🕒 *Шаг 1 из 5: Время тренировки*\n\nВведите время в формате \`17:00 – 18:00\` или \`18:00 – 19:30\`:`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard(`sched_day_${dayKey}`) }
  );
});

bot.callbackQuery(/^sched_del_menu_([0-6])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const schedule = getSchedule();
  const dayData = schedule[dayKey];

  if (!dayData || dayData.items.length === 0) {
    await ctx.reply('Нет занятий для удаления.', {
      reply_markup: new InlineKeyboard().text('🔙 Назад', `sched_day_${dayKey}`)
    });
    return;
  }

  const kb = new InlineKeyboard();
  dayData.items.forEach((item, idx) => {
    kb.text(`🗑️ ${idx + 1}. ${item.time} ${item.title.substring(0, 18)}...`, `sched_ask_del_${dayKey}_${idx}`).row();
  });
  kb.text('🔙 Назад к дню', `sched_day_${dayKey}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply('Выберите занятие для удаления:', { reply_markup: kb });
});

bot.callbackQuery(/^sched_ask_del_([0-6])_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayKey = Number(ctx.match[1]);
  const idx = Number(ctx.match[2]);
  const schedule = getSchedule();
  const item = schedule[dayKey]?.items[idx];

  if (!item) {
    await ctx.reply('Занятие не найдено.', { reply_markup: getDaysKeyboard() });
    return;
  }

  const kb = new InlineKeyboard()
    .text('💥 Да, удалить занятие', `sched_do_del_${dayKey}_${idx}`)
    .row()
    .text('❌ Отмена', `sched_edit_item_${dayKey}_${idx}`)
    .text('📅 К дню', `sched_day_${dayKey}`);

  await ctx.reply(
    `⚠️ *Подтверждение удаления занятия*\n\n` +
    `🕒 \`${item.time}\`\n` +
    `📌 *${item.title}*\n` +
    `👤 Тренер: ${item.coach}\n\n` +
    `Удалить это занятие из расписания?`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery(/^sched_do_del_([0-6])_(\d+)$/, async (ctx) => {
  const dayKey = Number(ctx.match[1]);
  const itemIndex = Number(ctx.match[2]);

  deleteScheduleItem(dayKey, itemIndex);
  await ctx.answerCallbackQuery('Занятие удалено');
  await ctx.reply('✅ Занятие удалено из расписания.', {
    reply_markup: new InlineKeyboard()
      .text('📅 Вернуться в день', `sched_day_${dayKey}`)
      .text('🎛️ Главное меню', 'back_main')
  });
});

// Schedule Category selector callbacks
bot.callbackQuery(/^sched_cat_([a-z]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const category = ctx.match[1] as 'kids' | 'junior' | 'pro' | 'choreo';
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);

  if (state.stage === 'sched_room' && state.draft) {
    const completeItem: ScheduleItem = {
      time: state.draft.time || '18:00 – 19:00',
      title: state.draft.title || 'Тренировка',
      coach: state.draft.coach || 'Тренерский состав',
      room: state.draft.room || 'Актовый зал',
      category
    };

    saveScheduleItem(state.dayKey, completeItem);
    const dayKey = state.dayKey;
    clearState(userId);

    await ctx.reply(
      `✅ *Занятие успешно добавлено в расписание!*\n\n` +
      `🕒 ${completeItem.time}\n` +
      `🏆 ${completeItem.title}\n` +
      `👤 Наставник: ${completeItem.coach}\n` +
      `🏛️ Зал: ${completeItem.room}`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('📅 Посмотреть расписание дня', `sched_day_${dayKey}`)
          .text('🎛️ Главное меню', 'back_main')
      }
    );
  }
});

// ==========================================
// 4. SECTION: GALLERY
// ==========================================

bot.callbackQuery('menu_gallery', async (ctx) => {
  await ctx.answerCallbackQuery();
  const gallery = getGallery();
  await ctx.reply(
    `📸 *Раздел «Галерея и фотографии турниров»*\n\n` +
    `Опубликовано фотографий: *${gallery.length}*\n\n` +
    `Фотографии отображаются в интерактивной Bento-сетке на главной странице.`,
    { reply_markup: getGalleryMenuKeyboard(), parse_mode: 'Markdown' }
  );
});

async function sendGalleryCard(ctx: any, item: GalleryItem, customKb?: InlineKeyboard) {
  const kb = customKb || new InlineKeyboard()
    .text('✏️ Редактировать', `gal_edit_${item.id}`)
    .text('🗑️ Удалить', `gal_del_${item.id}`);

  const caption =
    `📸 *${item.title}*\n` +
    `🎗️ ${item.badge} | 📁 ${item.category || 'Галерея'}\n\n` +
    `📝 ${item.caption}`;

  const photoSource = resolvePhotoSource(item.photo);
  try {
    await ctx.replyWithPhoto(photoSource, {
      caption,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
  } catch (err) {
    console.error(`Failed to send gallery photo for ${item.title}:`, err);
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      reply_markup: kb
    });
  }
}

bot.callbackQuery('gal_list', async (ctx) => {
  await ctx.answerCallbackQuery();
  const gallery = getGallery();

  if (gallery.length === 0) {
    const kb = new InlineKeyboard()
      .text('➕ Добавить фото', 'gal_add_start')
      .row()
      .text('🔙 В меню галереи', 'menu_gallery')
      .text('🎛️ Главное меню', 'back_main');
    await ctx.reply('В галерее пока нет фото.', { reply_markup: kb });
    return;
  }

  await ctx.reply(`📸 *Фотографии галереи ТСК «Авалон» (${gallery.length}):*`, {
    parse_mode: 'Markdown'
  });

  for (const item of gallery) {
    await sendGalleryCard(ctx, item);
  }

  const bottomKb = new InlineKeyboard()
    .text('➕ Добавить еще фото', 'gal_add_start')
    .row()
    .text('🔙 В меню галереи', 'menu_gallery')
    .text('🎛️ Главное меню', 'back_main');
  await ctx.reply('Управление галереей:', { reply_markup: bottomKb });
});

bot.callbackQuery(/^gal_edit_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match[1];
  const item = getGallery().find(g => g.id === itemId);
  if (!item) {
    await ctx.reply('Фотография не найдена.', { reply_markup: getGalleryMenuKeyboard() });
    return;
  }

  const kb = new InlineKeyboard()
    .text('🖼️ Заменить фото', `gal_ed_${item.id}_photo`)
    .text('📌 Изменить заголовок', `gal_ed_${item.id}_title`)
    .row()
    .text('📝 Изменить описание', `gal_ed_${item.id}_caption`)
    .row()
    .text('🎗️ Изменить бейдж', `gal_ed_${item.id}_badge`)
    .text('📁 Изменить категорию', `gal_ed_${item.id}_category`)
    .row()
    .text('🗑️ Удалить фото', `gal_del_${item.id}`)
    .row()
    .text('📸 Ко всей галерее', 'gal_list')
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `✏️ *Редактирование карточки в галерее:*\n` +
    `📸 *${item.title}*\n\n` +
    `Выберите поле для изменения:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery(/^gal_ed_(.+)_(photo|title|caption|badge|category)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match[1];
  const field = ctx.match[2] as 'photo' | 'title' | 'caption' | 'badge' | 'category';
  const item = getGallery().find(g => g.id === itemId);
  if (!item) return;

  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'gal_edit_field', itemId, field });

  if (field === 'caption') {
    const aiKb = new InlineKeyboard()
      .text('🪄 Новая подпись (AI)', `gal_ai_new_${item.id}`)
      .text('✨ Улучшить подпись (AI)', `gal_ai_imp_${item.id}`)
      .row()
      .text('✏️ Написать вручную', `gal_ed_${item.id}_caption_manual`)
      .row()
      .text('❌ Отмена', `gal_edit_${item.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Редактирование подписи к фото*\n` +
      `📸 *«${item.title}»*\n\n` +
      `Текущая подпись:\n` +
      `_${item.caption || 'Не заполнено'}_\n\n` +
      `_Вы можете отправить новый текст сообщением в чат или составить подпись через Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: aiKb }
    );
    return;
  }

  const cancelKb = getCancelKeyboard(`gal_edit_${item.id}`);

  const prompts: Record<string, string> = {
    photo: `📸 Отправьте *новую фотографию* для карточки «${item.title}» в чат:\n_Поддерживаются обычные фото и файлы без сжатия._`,
    title: `📌 Текущий заголовок: *${item.title}*\n\nВведите новый заголовок:`,
    caption: `📝 Текущее описание:\n_${item.caption}_\n\nВведите новое описание:`,
    badge: `🎗️ Текущий бейдж: *${item.badge}*\n\nВведите новый бейдж (награду/статус):`,
    category: `📁 Текущая категория: *${item.category || '-'}*\n\nВведите новую категорию (например: *Н3*, *Усадьба Свиблово*, *Сборы*):`
  };

  await ctx.reply(prompts[field], { parse_mode: 'Markdown', reply_markup: cancelKb });
});

// Gallery AI Handlers
bot.callbackQuery(/^gal_ai_new_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую подпись...');
  const itemId = ctx.match[1];
  const item = getGallery().find(g => g.id === itemId);
  if (!item) return;

  const waitMsg = await ctx.reply('⏳ *Gemini составляет подпись...*', { parse_mode: 'Markdown' });
  try {
    const generated = await generateGalleryCaption(item.title, item.badge);
    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_gal_caption_edit', itemId: item.id, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `gal_ai_apply_${item.id}`)
      .text('🔄 Другой вариант', `gal_ai_new_${item.id}`)
      .row()
      .text('✏️ Написать вручную', `gal_ed_${item.id}_caption_manual`)
      .row()
      .text('❌ Отмена', `gal_edit_${item.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Новая подпись для «${item.title}»:*\n\n` +
      `«${generated}»\n\n` +
      `_Применить на сайте или попробовать еще раз? Либо отправьте свой вариант сообщением:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите описание вручную:`, {
      reply_markup: getCancelKeyboard(`gal_edit_${item.id}`)
    });
  }
});

bot.callbackQuery(/^gal_ai_imp_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Улучшаю подпись...');
  const itemId = ctx.match[1];
  const item = getGallery().find(g => g.id === itemId);
  if (!item) return;

  const waitMsg = await ctx.reply('⏳ *Gemini редактирует подпись...*', { parse_mode: 'Markdown' });
  try {
    const improved = await improveGalleryCaption(item.caption, item.title);
    const userId = ctx.chat?.id || 0;
    setState(userId, { stage: 'ai_preview_gal_caption_edit', itemId: item.id, generatedText: improved });

    const kb = new InlineKeyboard()
      .text('✅ Применить на сайт', `gal_ai_apply_${item.id}`)
      .text('🔄 Попробовать еще раз', `gal_ai_imp_${item.id}`)
      .row()
      .text('✏️ Написать вручную', `gal_ed_${item.id}_caption_manual`)
      .row()
      .text('❌ Отмена', `gal_edit_${item.id}`)
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `✨ *Улучшенная подпись для «${item.title}»:*\n\n` +
      `«${improved}»\n\n` +
      `_Применить на сайте или попробовать еще раз?_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка улучшения: ${err.message}\nВведите описание вручную:`, {
      reply_markup: getCancelKeyboard(`gal_edit_${item.id}`)
    });
  }
});

bot.callbackQuery(/^gal_ai_apply_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Сохранено!');
  const itemId = ctx.match[1];
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_gal_caption_edit' || state.itemId !== itemId) return;

  const item = getGallery().find(g => g.id === itemId);
  if (!item) return;

  item.caption = state.generatedText;
  saveGalleryItem(item);
  clearState(userId);

  await ctx.reply(`✅ Подпись карточки *«${item.title}»* обновлена и сохранена на сайте!`, {
    parse_mode: 'Markdown'
  });
  await sendGalleryCard(ctx, item, getGalleryPostEditKeyboard(item.id));
});

bot.callbackQuery(/^gal_ed_(.+)_caption_manual$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match[1];
  const item = getGallery().find(g => g.id === itemId);
  if (!item) return;
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'gal_edit_field', itemId, field: 'caption' });
  await ctx.reply(`📝 Отправьте новую подпись для *«${item.title}»* сообщением в чат:`, {
    parse_mode: 'Markdown',
    reply_markup: getCancelKeyboard(`gal_edit_${item.id}`)
  });
});

// Gallery wizard AI callbacks
bot.callbackQuery('gal_ai_gen_caption', async (ctx) => {
  await ctx.answerCallbackQuery('Генерирую подпись...');
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'gal_caption' && state.stage !== 'ai_preview_gal_caption_wizard') return;

  const waitMsg = await ctx.reply('⏳ *Gemini пишет подпись к фото...*', { parse_mode: 'Markdown' });
  try {
    const draft = state.draft;
    const generated = await generateGalleryCaption(draft.title || 'Событие клуба');

    setState(userId, { stage: 'ai_preview_gal_caption_wizard', draft, generatedText: generated });

    const kb = new InlineKeyboard()
      .text('✅ Использовать этот текст', 'gal_ai_accept_caption')
      .text('🔄 Другой вариант', 'gal_ai_gen_caption')
      .row()
      .text('✏️ Написать вручную', 'gal_ai_manual_caption')
      .row()
      .text('❌ Отмена', 'gal_list')
      .text('🎛️ Главное меню', 'back_main');

    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(
      `🪄 *Сгенерированная подпись для «${draft.title}»:*\n\n` +
      `«${generated}»\n\n` +
      `_Нажмите «✅ Использовать этот текст» для перехода к бейджу, либо отправьте свой текст сообщением:_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  } catch (err: any) {
    await bot.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply(`⚠️ Ошибка генерации: ${err.message}\nВведите подпись вручную:`, {
      reply_markup: getCancelKeyboard('gal_list')
    });
  }
});

bot.callbackQuery('gal_ai_accept_caption', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_preview_gal_caption_wizard') return;

  state.draft.caption = state.generatedText;
  setState(userId, { stage: 'gal_badge', draft: state.draft });

  await ctx.reply(
    `🏷️ *Шаг 4 из 4: Бейдж*\n\n` +
    `Введите плашку (например: *1 место и Суперкубок*, *Конкурсная пара*, *Сборы в Крокусе*):`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('gal_list') }
  );
});

bot.callbackQuery('gal_ai_manual_caption', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage === 'ai_preview_gal_caption_wizard') {
    setState(userId, { stage: 'gal_caption', draft: state.draft });
  }
  await ctx.reply('Введите подпись к фото сообщением в чат:', {
    reply_markup: getCancelKeyboard('gal_list')
  });
});


bot.callbackQuery(/^gal_del_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match[1];
  if (!itemId) return;
  const item = getGallery().find(g => g.id === itemId);
  const title = item?.title || 'Фотография';

  const confirmKb = new InlineKeyboard()
    .text('💥 Да, удалить из галереи', `gal_del_confirm_${itemId}`)
    .row()
    .text('❌ Отмена', `gal_edit_${itemId}`)
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `⚠️ *Подтверждение удаления фото*\n\n` +
    `Вы уверены, что хотите удалить карточку *«${title}»* из галереи сайта?`,
    { parse_mode: 'Markdown', reply_markup: confirmKb }
  );
});

bot.callbackQuery(/^gal_del_confirm_(.+)$/, async (ctx) => {
  const itemId = ctx.match[1];
  if (!itemId) return;
  deleteGalleryItem(itemId);
  await ctx.answerCallbackQuery('Фото удалено');
  await ctx.reply('✅ Фотография удалена из галереи сайта.', {
    reply_markup: new InlineKeyboard()
      .text('📸 Ко всей галерее', 'gal_list')
      .text('🎛️ Главное меню', 'back_main')
  });
});

bot.callbackQuery('gal_add_start', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'gal_photo', draft: {} });

  await ctx.reply(
    `📸 *Шаг 1 из 4: Загрузка фото*\n\n` +
    `Отправьте фотографию кубка, победы, турнира или зала в чат.\n` +
    `_Бот скачает оригинал в максимальном разрешении._`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard() }
  );
});

// ==========================================
// 5. SECTION: HALL STATUS
// ==========================================

bot.callbackQuery('menu_status', async (ctx) => {
  await ctx.answerCallbackQuery();
  const current = getHallStatus();

  const keyboard = new InlineKeyboard()
    .text('🟢 Всё по расписанию', 'set_status_normal')
    .row()
    .text('🟡 Мероприятие в усадьбе (Авиапарк)', 'set_status_aviapark')
    .row()
    .text('🏆 Выезд на турнир', 'set_status_tour')
    .row()
    .text('📢 Открытый прогон в 17:00', 'set_status_progon')
    .row()
    .text('✏️ Написать свой статус', 'set_status_custom_start')
    .row()
    .text('🔙 Главное меню', 'back_main');

  await ctx.reply(
    `🏛️ *Оперативный статус зала на сайте:*\n\n` +
    `Текущий статус:\n*«${current.status}»*\n\n` +
    `Выберите готовый шаблон или введите свой текст:`,
    { reply_markup: keyboard, parse_mode: 'Markdown' }
  );
});

bot.callbackQuery('set_status_normal', async (ctx) => {
  const updated = updateHallStatus('Зал открыт • Занятия строго по расписанию');
  await ctx.answerCallbackQuery('Статус обновлен!');
  await ctx.reply(`✅ Статус на сайте обновлен:\n*«${updated.status}»*`, {
    parse_mode: 'Markdown',
    reply_markup: getStatusPostEditKeyboard()
  });
});

bot.callbackQuery('set_status_aviapark', async (ctx) => {
  const updated = updateHallStatus('Внимание: сегодня в усадьбе мероприятие, занятия переносятся в Авиапарк');
  await ctx.answerCallbackQuery('Статус обновлен!');
  await ctx.reply(`⚠️ Статус на сайте обновлен:\n*«${updated.status}»*`, {
    parse_mode: 'Markdown',
    reply_markup: getStatusPostEditKeyboard()
  });
});

bot.callbackQuery('set_status_tour', async (ctx) => {
  const updated = updateHallStatus('Клуб на выездном турнире. Занятия возобновляются в понедельник.');
  await ctx.answerCallbackQuery('Статус обновлен!');
  await ctx.reply(`🏆 Статус на сайте обновлен:\n*«${updated.status}»*`, {
    parse_mode: 'Markdown',
    reply_markup: getStatusPostEditKeyboard()
  });
});

bot.callbackQuery('set_status_progon', async (ctx) => {
  const updated = updateHallStatus('Сегодня открытый концертный прогон в 17:00. Приглашаем родителей!');
  await ctx.answerCallbackQuery('Статус обновлен!');
  await ctx.reply(`📢 Статус на сайте обновлен:\n*«${updated.status}»*`, {
    parse_mode: 'Markdown',
    reply_markup: getStatusPostEditKeyboard()
  });
});

bot.callbackQuery('set_status_custom_start', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'status_custom' });

  await ctx.reply(
    `✍️ *Введите произвольный статус зала:*\n\nНапишите текст, который будет сразу опубликован в шапке сайта:`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('menu_status') }
  );
});

// ==========================================
// 6. SECTION: AI COPYWRITER HUB
// ==========================================

bot.callbackQuery('menu_ai', async (ctx) => {
  await ctx.answerCallbackQuery();
  clearState(ctx.chat?.id || 0);

  const kb = new InlineKeyboard()
    .text('👨‍🏫 Описания наставников', 'ai_hub_coach')
    .row()
    .text('📢 Тексты анонсов', 'ai_hub_ann')
    .row()
    .text('📸 Подписи для галереи', 'ai_hub_gal')
    .row()
    .text('✍️ Свободный помощник (тезисы → текст)', 'ai_hub_free')
    .row()
    .text('🔙 Главное меню', 'back_main');

  await ctx.reply(
    `🪄 *AI-Копирайтер ТСК «Авалон»*\n\n` +
    `Интегрирован со шлюзом Gemini на сервере через OpenAI-совместимый протокол.\n` +
    `Помогает мгновенно писать привлекательные описания тренеров, анонсы и подписи к победам без канцелярита и AI-клише.\n\n` +
    `*Выберите раздел:*`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery('ai_hub_coach', async (ctx) => {
  await ctx.answerCallbackQuery();
  const coaches = getCoaches();
  const kb = new InlineKeyboard();

  coaches.forEach(c => {
    kb.text(`👤 ${c.name}`, `coach_ed_${c.id}_desc`).row();
  });
  kb.text('➕ Добавить нового с AI', 'coach_add_start').row();
  kb.text('🔙 В меню AI', 'menu_ai');

  await ctx.reply(
    `👨‍🏫 *AI-генерация описаний наставников*\n\n` +
    `Выберите тренера для составления или улучшения описания:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery('ai_hub_ann', async (ctx) => {
  await ctx.answerCallbackQuery();
  const anns = getAnnouncements();
  const kb = new InlineKeyboard();

  anns.slice(0, 6).forEach(a => {
    kb.text(`📢 ${a.title.slice(0, 28)}`, `ann_ed_${a.id}_text`).row();
  });
  kb.text('➕ Создать новый анонс с AI', 'ann_add_start').row();
  kb.text('🔙 В меню AI', 'menu_ai');

  await ctx.reply(
    `📢 *AI-генерация текстов анонсов*\n\n` +
    `Выберите существующий анонс для редактирования или создайте новый:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery('ai_hub_gal', async (ctx) => {
  await ctx.answerCallbackQuery();
  const items = getGallery();
  const kb = new InlineKeyboard();

  items.slice(0, 6).forEach(g => {
    kb.text(`📸 ${g.title.slice(0, 28)}`, `gal_ed_${g.id}_caption`).row();
  });
  kb.text('➕ Добавить фото в галерею с AI', 'gal_add_start').row();
  kb.text('🔙 В меню AI', 'menu_ai');

  await ctx.reply(
    `📸 *AI-подписи для фото в галерее*\n\n` +
    `Выберите фото для составления яркой подписи или добавьте новое:`,
    { parse_mode: 'Markdown', reply_markup: kb }
  );
});

bot.callbackQuery('ai_hub_free', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  setState(userId, { stage: 'ai_free_prompt' });

  const cancelKb = new InlineKeyboard()
    .text('❌ Отмена', 'menu_ai')
    .text('🎛️ Главное меню', 'back_main');

  await ctx.reply(
    `✍️ *Свободный AI-помощник ТСК «Авалон»*\n\n` +
    `Отправьте в чат любые тезисы, тему новости, расписание турнира или заметку.\n\n` +
    `_Пример:_\n` +
    `«В эти выходные прошел турнир в Крокусе, пара Иван и Мария заняли 1 место в Юниорах по стандарту, открываем дополнительный набор в группу»\n\n` +
    `Gemini оформит это в готовый клубный текст, который вы сможете сразу опубликовать на сайте!`,
    { parse_mode: 'Markdown', reply_markup: cancelKb }
  );
});

bot.callbackQuery('ai_free_publish_ann', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);
  if (state.stage !== 'ai_free_preview') return;

  const text = state.generatedText;
  setState(userId, { stage: 'ann_title', draft: { text } });

  await ctx.reply(
    `📢 *Публикация анонса на сайте*\n\n` +
    `Текст уже подготовлен:\n_${text}_\n\n` +
    `📌 *Шаг 1 из 2: Введите заголовок для анонса*\n(например: *Весенние сборы* или *Победа на турнире*):`,
    { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('menu_ai') }
  );
});

// ==========================================
// 7. GENERAL MESSAGE & PHOTO HANDLER
// ==========================================


async function handleIncomingPhoto(ctx: any, fileId: string) {
  const userId = ctx.chat?.id;
  if (!userId) return;
  const state = getState(userId);

  if (state.stage === 'coach_photo') {
    await ctx.reply('⏳ Загружаю и обрабатываю фото наставника...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'coaches');
      state.draft.photo = publicUrl;
      setState(userId, { stage: 'coach_name', draft: state.draft });

      await ctx.reply(
        `✅ Фотография успешно сохранена!\n\n` +
        `✍️ *Шаг 2 из 6: ФИО наставника*\n` +
        `Введите имя и фамилию преподавателя (например: *Анна Турчина*):`,
        { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('coach_list') }
      );
    } catch (err: any) {
      console.error('Error saving coach photo:', err);
      await ctx.reply('Не удалось сохранить фото. Попробуйте еще раз или нажмите отмену.', {
        reply_markup: getCancelKeyboard('coach_list')
      });
    }
    return;
  }

  if (state.stage === 'ann_photo') {
    await ctx.reply('⏳ Загружаю афишу анонса...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'announcements');
      state.draft.photo = publicUrl;

      const completeAnn: Announcement = {
        id: `ann-${Date.now()}`,
        title: state.draft.title || 'Анонс',
        text: state.draft.text || '',
        tag: state.draft.tag || 'Событие',
        date: new Date().toISOString().split('T')[0] ?? '',
        photo: publicUrl,
        active: true
      };

      saveAnnouncement(completeAnn);
      clearState(userId);

      await ctx.reply(
        `🎉 *Анонс опубликован на сайте!*\n\n` +
        `📢 *${completeAnn.title}*\n` +
        `🏷️ ${completeAnn.tag}\n\n` +
        `${completeAnn.text}`,
        { parse_mode: 'Markdown', reply_markup: getAnnouncementPostEditKeyboard(completeAnn.id) }
      );
    } catch (err: any) {
      console.error('Error saving announcement photo:', err);
      await ctx.reply('Ошибка загрузки фото.', { reply_markup: getCancelKeyboard('ann_list') });
    }
    return;
  }

  if (state.stage === 'gal_photo') {
    await ctx.reply('⏳ Загружаю фото в галерею клуба...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'gallery');
      state.draft.photo = publicUrl;
      setState(userId, { stage: 'gal_title', draft: state.draft });

      await ctx.reply(
        `✅ Фотография загружена!\n\n` +
        `✍️ *Шаг 2 из 4: Заголовок фотографии*\n` +
        `Введите заголовок карточки (например: *Миша и Арина на турнире* или *Сборы в Крокусе*):`,
        { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('gal_list') }
      );
    } catch (err: any) {
      console.error('Error saving gallery photo:', err);
      await ctx.reply('Ошибка загрузки фото.', { reply_markup: getCancelKeyboard('gal_list') });
    }
    return;
  }

  // Editing coach photo
  if (state.stage === 'coach_edit_field' && state.field === 'photo') {
    await ctx.reply('⏳ Загружаю и обновляю фото наставника...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'coaches');
      const coach = getCoaches().find(c => c.id === state.coachId);
      if (coach) {
        coach.photo = publicUrl;
        saveCoach(coach);
        clearState(userId);
        await ctx.reply(`✅ Фотография наставника *${coach.name}* успешно обновлена и опубликована на сайте!`, {
          parse_mode: 'Markdown'
        });
        await sendCoachCard(ctx, coach, getCoachPostEditKeyboard(coach.id));
      }
    } catch (err: any) {
      console.error('Error updating coach photo:', err);
      await ctx.reply('Ошибка загрузки фото. Попробуйте еще раз или нажмите отмену.', {
        reply_markup: getCancelKeyboard(`coach_edit_${state.coachId}`)
      });
    }
    return;
  }

  // Editing gallery photo
  if (state.stage === 'gal_edit_field' && state.field === 'photo') {
    await ctx.reply('⏳ Загружаю и заменяю фото в галерее...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'gallery');
      const item = getGallery().find(g => g.id === state.itemId);
      if (item) {
        item.photo = publicUrl;
        saveGalleryItem(item);
        clearState(userId);
        await ctx.reply(`✅ Фотография карточки *«${item.title}»* обновлена и опубликована на сайте!`, {
          parse_mode: 'Markdown'
        });
        await sendGalleryCard(ctx, item, getGalleryPostEditKeyboard(item.id));
      }
    } catch (err: any) {
      console.error('Error updating gallery photo:', err);
      await ctx.reply('Ошибка загрузки фото.', { reply_markup: getCancelKeyboard(`gal_edit_${state.itemId}`) });
    }
    return;
  }

  // Editing announcement photo
  if (state.stage === 'ann_edit_field' && state.field === 'photo') {
    await ctx.reply('⏳ Загружаю и обновляю афишу анонса...');
    try {
      const publicUrl = await downloadTelegramPhoto(fileId, 'announcements');
      const ann = getAnnouncements().find(a => a.id === state.annId);
      if (ann) {
        ann.photo = publicUrl;
        saveAnnouncement(ann);
        clearState(userId);
        await ctx.reply(`✅ Афиша анонса *«${ann.title}»* обновлена и опубликована!`, {
          parse_mode: 'Markdown'
        });
        await sendAnnouncementCard(ctx, ann, getAnnouncementPostEditKeyboard(ann.id));
      }
    } catch (err: any) {
      console.error('Error updating announcement photo:', err);
      await ctx.reply('Ошибка загрузки фото.', { reply_markup: getCancelKeyboard(`ann_edit_${state.annId}`) });
    }
    return;
  }

  // Fallback if photo was sent without active wizard: prompt what to do
  const promptKb = new InlineKeyboard()
    .text('📸 В галерею клуба', 'gal_add_start')
    .text('👨‍🏫 Добавить наставника', 'coach_add_start')
    .row()
    .text('📢 Создать анонс с фото', 'ann_add_start')
    .text('🎛️ Главное меню', 'back_main');
  await ctx.reply('📸 Получена фотография. Выберите, куда ее опубликовать:', { reply_markup: promptKb });
}

bot.on('message:photo', async (ctx) => {
  const photos = ctx.message.photo;
  if (!photos || photos.length === 0) return;
  const largestPhoto = photos[photos.length - 1];
  if (!largestPhoto) return;
  await handleIncomingPhoto(ctx, largestPhoto.file_id);
});

bot.on('message:document', async (ctx) => {
  const doc = ctx.message.document;
  if (!doc) return;
  const mime = doc.mime_type || '';
  if (mime.startsWith('image/')) {
    await handleIncomingPhoto(ctx, doc.file_id);
  } else {
    await ctx.reply('📎 Получен файл, но это не изображение. Отправьте файл формата JPG или PNG.', {
      reply_markup: getCancelKeyboard()
    });
  }
});

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.chat.id;
  const state = getState(userId);

  // Status custom text
  if (state.stage === 'status_custom') {
    const updated = updateHallStatus(text);
    clearState(userId);
    await ctx.reply(`✅ Статус на сайте обновлен:\n*«${updated.status}»*`, {
      parse_mode: 'Markdown',
      reply_markup: getStatusPostEditKeyboard()
    });
    return;
  }

  // Standalone AI Free Copilot Prompt
  if (state.stage === 'ai_free_prompt') {
    const waitMsg = await ctx.reply('⏳ *Gemini составляет клубный текст для ТСК «Авалон»...*', { parse_mode: 'Markdown' });
    try {
      const generated = await generateFreeCopilot(text);
      setState(userId, { stage: 'ai_free_preview', generatedText: generated });

      const kb = new InlineKeyboard()
        .text('📢 Опубликовать как анонс', 'ai_free_publish_ann')
        .row()
        .text('🔄 Другой вариант', 'ai_hub_free')
        .text('🪄 В меню AI', 'menu_ai')
        .row()
        .text('🎛️ Главное меню', 'back_main');

      await bot.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.reply(
        `🪄 *Сгенерированный текст:*\n\n` +
        `«${generated}»\n\n` +
        `_Вы можете в один клик опубликовать его как анонс на сайте или использовать в соцсетях:_`,
        { parse_mode: 'Markdown', reply_markup: kb }
      );
    } catch (err: any) {
      await bot.api.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
      await ctx.reply(`⚠️ Ошибка генерации: ${err.message}`, {
        reply_markup: new InlineKeyboard().text('🪄 В меню AI', 'menu_ai').text('🎛️ Главное меню', 'back_main')
      });
    }
    return;
  }

  // Manual text fallback during Coach AI edit preview
  if (state.stage === 'ai_preview_coach_desc_edit') {
    const coach = getCoaches().find(c => c.id === state.coachId);
    if (coach) {
      coach.desc = text;
      saveCoach(coach);
      clearState(userId);
      await ctx.reply(`✅ Описание наставника *${coach.name}* обновлено вручную и опубликовано на сайте!`, {
        parse_mode: 'Markdown'
      });
      await sendCoachCard(ctx, coach, getCoachPostEditKeyboard(coach.id));
    }
    return;
  }

  // Manual text fallback during Announcement AI edit preview
  if (state.stage === 'ai_preview_ann_text_edit') {
    const ann = getAnnouncements().find(a => a.id === state.annId);
    if (ann) {
      ann.text = text;
      saveAnnouncement(ann);
      clearState(userId);
      await ctx.reply(`✅ Текст анонса *«${ann.title}»* обновлен вручную и опубликован на сайте!`, {
        parse_mode: 'Markdown'
      });
      await sendAnnouncementCard(ctx, ann, getAnnouncementPostEditKeyboard(ann.id));
    }
    return;
  }

  // Manual text fallback during Gallery AI edit preview
  if (state.stage === 'ai_preview_gal_caption_edit') {
    const item = getGallery().find(g => g.id === state.itemId);
    if (item) {
      item.caption = text;
      saveGalleryItem(item);
      clearState(userId);
      await ctx.reply(`✅ Подпись карточки *«${item.title}»* обновлена вручную и сохранена на сайте!`, {
        parse_mode: 'Markdown'
      });
      await sendGalleryCard(ctx, item, getGalleryPostEditKeyboard(item.id));
    }
    return;
  }


  // Editing Coach Fields
  if (state.stage === 'coach_edit_field') {
    const coach = getCoaches().find(c => c.id === state.coachId);
    if (!coach) {
      clearState(userId);
      await ctx.reply('Преподаватель не найден.', { reply_markup: getCoachesMenuKeyboard() });
      return;
    }

    if (state.field === 'name') coach.name = text;
    else if (state.field === 'role') coach.role = text;
    else if (state.field === 'badge') coach.badge = text;
    else if (state.field === 'desc') coach.desc = text;
    else if (state.field === 'specs') {
      coach.specs = text.split(',').map(s => s.trim()).filter(Boolean);
    }

    saveCoach(coach);
    clearState(userId);

    await ctx.reply(`✅ Данные наставника *${coach.name}* обновлены и сразу видны на сайте!`, {
      parse_mode: 'Markdown'
    });
    await sendCoachCard(ctx, coach, getCoachPostEditKeyboard(coach.id));
    return;
  }

  // Editing Announcement Fields
  if (state.stage === 'ann_edit_field') {
    const ann = getAnnouncements().find(a => a.id === state.annId);
    if (!ann) {
      clearState(userId);
      await ctx.reply('Анонс не найден.', { reply_markup: getAnnouncementsMenuKeyboard() });
      return;
    }

    if (state.field === 'title') ann.title = text;
    else if (state.field === 'tag') ann.tag = text;
    else if (state.field === 'text') ann.text = text;

    saveAnnouncement(ann);
    clearState(userId);

    await ctx.reply(`✅ Анонс *«${ann.title}»* успешно обновлен и опубликован!`, {
      parse_mode: 'Markdown'
    });
    await sendAnnouncementCard(ctx, ann, getAnnouncementPostEditKeyboard(ann.id));
    return;
  }

  // Editing Schedule Item Fields
  if (state.stage === 'sched_edit_field') {
    const schedule = getSchedule();
    const item = schedule[state.dayKey]?.items[state.itemIndex];
    if (item) {
      if (state.field === 'time') item.time = text;
      else if (state.field === 'title') item.title = text;
      else if (state.field === 'coach') item.coach = text;
      else if (state.field === 'room') item.room = text;

      saveScheduleItem(state.dayKey, item, state.itemIndex);
      const dayKey = state.dayKey;
      const itemIndex = state.itemIndex;
      clearState(userId);

      await ctx.reply(`✅ Поле занятия #${itemIndex + 1} успешно обновлено!`, {
        parse_mode: 'Markdown',
        reply_markup: getSchedulePostEditKeyboard(dayKey, itemIndex)
      });
    }
    return;
  }

  // Editing Gallery Item Fields
  if (state.stage === 'gal_edit_field') {
    const item = getGallery().find(g => g.id === state.itemId);
    if (!item) {
      clearState(userId);
      await ctx.reply('Фотография не найдена.', { reply_markup: getGalleryMenuKeyboard() });
      return;
    }

    if (state.field === 'title') item.title = text;
    else if (state.field === 'caption') item.caption = text;
    else if (state.field === 'badge') item.badge = text;
    else if (state.field === 'category') item.category = text;

    saveGalleryItem(item);
    clearState(userId);

    await ctx.reply(`✅ Карточка *«${item.title}»* в галерее обновлена!`, {
      parse_mode: 'Markdown'
    });
    await sendGalleryCard(ctx, item, getGalleryPostEditKeyboard(item.id));
    return;
  }

  // Coach wizard steps
  if (state.stage === 'coach_name') {
    state.draft.name = text;
    setState(userId, { stage: 'coach_role', draft: state.draft });
    await ctx.reply(
      `🎖️ *Шаг 3 из 6: Должность или роль*\n\n` +
      `Введите роль (например: *Руководитель клуба, главный тренер* или *Направление Латина*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('coach_list') }
    );
    return;
  }

  if (state.stage === 'coach_role') {
    state.draft.role = text;
    setState(userId, { stage: 'coach_badge', draft: state.draft });
    await ctx.reply(
      `🏷️ *Шаг 4 из 6: Бейдж*\n\n` +
      `Краткая плашка на карточке (например: *Основатель клуба*, *PRO Латина*, *PRO Стандарт*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('coach_list') }
    );
    return;
  }

  if (state.stage === 'coach_badge') {
    state.draft.badge = text;
    setState(userId, { stage: 'coach_desc', draft: state.draft });
    const descKb = new InlineKeyboard()
      .text('🪄 Сгенерировать через AI', 'coach_ai_gen_desc')
      .row()
      .text('❌ Отмена', 'coach_list')
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Шаг 5 из 6: Описание наставника*\n\n` +
      `Расскажите об опыте, преподаваемых группах и спортивных регалиях (1–3 предложения).\n\n` +
      `_Вы можете ввести текст вручную или нажать кнопку ниже для умной генерации через Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: descKb }
    );
    return;
  }

  if (state.stage === 'coach_desc' || state.stage === 'ai_preview_coach_desc_wizard') {
    state.draft.desc = text;
    setState(userId, { stage: 'coach_specs', draft: state.draft });
    await ctx.reply(
      `🏷️ *Шаг 6 из 6: Ключевые теги*\n\n` +
      `Введите направления через запятую (например: *Начальная подготовка, Балет, Постановка пар, Прогоны*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('coach_list') }
    );
    return;
  }

  if (state.stage === 'coach_specs') {
    const specs = text.split(',').map(s => s.trim()).filter(Boolean);
    const existingCoaches = getCoaches();

    const completeCoach: Coach = {
      id: `coach-${Date.now()}`,
      name: state.draft.name || 'Преподаватель',
      role: state.draft.role || 'Тренер',
      badge: state.draft.badge || 'Наставник',
      desc: state.draft.desc || '',
      photo: state.draft.photo || '/images/club/channel_avatar.jpg',
      specs: specs.length > 0 ? specs : ['Бальные танцы'],
      order: existingCoaches.length + 1
    };

    saveCoach(completeCoach);
    clearState(userId);

    await ctx.reply(
      `🎉 *Преподаватель успешно добавлен и опубликован на сайте!*\n\n` +
      `👤 *${completeCoach.name}*\n` +
      `🎗️ ${completeCoach.badge} | ${completeCoach.role}\n` +
      `📝 ${completeCoach.desc}\n` +
      `🏷️ ${completeCoach.specs.join(', ')}`,
      { parse_mode: 'Markdown', reply_markup: getCoachPostEditKeyboard(completeCoach.id) }
    );
    return;
  }

  // Announcement wizard steps
  if (state.stage === 'ann_title') {
    state.draft.title = text;
    if (state.draft.text) {
      // Draft text already set (e.g. from AI copilot)!
      setState(userId, { stage: 'ann_tag', draft: state.draft });
      await ctx.reply(
        `🏷️ *Шаг 2 из 2: Плашка / Категория*\n\n` +
        `Введите название плашки (например: *Событие*, *Мастер-класс*, *Турнир*, *Набор 2026*, *Сборы*):`,
        { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('ann_list') }
      );
      return;
    }

    setState(userId, { stage: 'ann_text', draft: state.draft });
    const annKb = new InlineKeyboard()
      .text('🪄 Сгенерировать через AI', 'ann_ai_gen_text')
      .row()
      .text('❌ Отмена', 'ann_list')
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Шаг 2 из 3: Текст анонса*\n\n` +
      `Введите подробное описание события, время проведения и детали:\n\n` +
      `_Или нажмите кнопку ниже, чтобы составить текст через Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: annKb }
    );
    return;
  }

  if (state.stage === 'ann_text' || state.stage === 'ai_preview_ann_text_wizard') {
    state.draft.text = text;
    setState(userId, { stage: 'ann_tag', draft: state.draft });
    await ctx.reply(
      `🏷️ *Шаг 3 из 3: Плашка / Категория*\n\n` +
      `Введите название плашки (например: *Мастер-класс*, *Турнир*, *Набор 2026*, *Сборы*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('ann_list') }
    );
    return;
  }


  if (state.stage === 'ann_tag') {
    state.draft.tag = text;
    setState(userId, { stage: 'ann_photo', draft: state.draft });

    const photoKb = new InlineKeyboard()
      .text('➡️ Опубликовать без фото', 'ann_skip_photo')
      .row()
      .text('❌ Отмена', 'ann_list')
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📸 *Прикрепить афишу или фото?*\n\n` +
      `Отправьте картинку в чат или нажмите кнопку «Опубликовать без фото»:`,
      { parse_mode: 'Markdown', reply_markup: photoKb }
    );
    return;
  }

  // Schedule wizard steps
  if (state.stage === 'sched_day_note') {
    saveDayAnnouncement(state.dayKey, text);
    const dayKey = state.dayKey;
    clearState(userId);
    await ctx.reply(`✅ Объявление для дня недели сохранено!`, {
      reply_markup: new InlineKeyboard()
        .text('📅 К расписанию дня', `sched_day_${dayKey}`)
        .text('🎛️ Главное меню', 'back_main')
    });
    return;
  }

  if (state.stage === 'sched_time') {
    state.draft.time = text;
    setState(userId, { stage: 'sched_title', dayKey: state.dayKey, draft: state.draft });
    await ctx.reply(
      `🏆 *Шаг 2 из 5: Название занятия*\n\nВведите название группы (например: *Младшая группа — Латина* или *ПРО СТ — Спецкурс Танго*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard(`sched_day_${state.dayKey}`) }
    );
    return;
  }

  if (state.stage === 'sched_title') {
    state.draft.title = text;
    setState(userId, { stage: 'sched_coach', dayKey: state.dayKey, draft: state.draft });
    await ctx.reply(
      `👤 *Шаг 3 из 5: Преподаватель*\n\nВведите имя тренера (например: *Анна Турчина* или *Максим Проскурин*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard(`sched_day_${state.dayKey}`) }
    );
    return;
  }

  if (state.stage === 'sched_coach') {
    state.draft.coach = text;
    setState(userId, { stage: 'sched_room', dayKey: state.dayKey, draft: state.draft });
    await ctx.reply(
      `🏛️ *Шаг 4 из 5: Зал проведения*\n\nВведите зал (например: *Актовый зал*, *1 этаж*, *Конференц-зал* или *Бальный зал*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard(`sched_day_${state.dayKey}`) }
    );
    return;
  }

  if (state.stage === 'sched_room') {
    state.draft.room = text;

    const catKb = new InlineKeyboard()
      .text('🧸 Дети 4–7 лет', 'sched_cat_kids')
      .text('🥈 Средние/конкурсные', 'sched_cat_junior')
      .row()
      .text('🏆 PRO и старшие', 'sched_cat_pro')
      .text('🩰 Хореография/ОФП', 'sched_cat_choreo')
      .row()
      .text('❌ Отмена', `sched_day_${state.dayKey}`)
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `🎯 *Шаг 5 из 5: Категория направления*\n\nВыберите фильтр для отображения на сайте:`,
      { parse_mode: 'Markdown', reply_markup: catKb }
    );
    return;
  }

  // Gallery wizard steps
  if (state.stage === 'gal_title') {
    state.draft.title = text;
    setState(userId, { stage: 'gal_caption', draft: state.draft });
    const galKb = new InlineKeyboard()
      .text('🪄 Сгенерировать подпись через AI', 'gal_ai_gen_caption')
      .row()
      .text('❌ Отмена', 'gal_list')
      .text('🎛️ Главное меню', 'back_main');

    await ctx.reply(
      `📝 *Шаг 3 из 4: Краткая подпись*\n\nВведите пояснение к фото (например: *1 место в категории Н3, поздравляем!*):\n\n` +
      `_Или нажмите кнопку ниже для умного составления подписи через Gemini:_`,
      { parse_mode: 'Markdown', reply_markup: galKb }
    );
    return;
  }

  if (state.stage === 'gal_caption' || state.stage === 'ai_preview_gal_caption_wizard') {
    state.draft.caption = text;
    setState(userId, { stage: 'gal_badge', draft: state.draft });
    await ctx.reply(
      `🏷️ *Шаг 4 из 4: Бейдж*\n\nВведите плашку (например: *1 место и Суперкубок*, *Конкурсная пара*, *Сборы в Крокусе*):`,
      { parse_mode: 'Markdown', reply_markup: getCancelKeyboard('gal_list') }
    );
    return;
  }


  if (state.stage === 'gal_badge') {
    state.draft.badge = text;
    const existing = getGallery();

    const completeItem: GalleryItem = {
      id: `gal-${Date.now()}`,
      title: state.draft.title || 'Событие клуба',
      caption: state.draft.caption || '',
      badge: text,
      category: 'Клуб',
      photo: state.draft.photo || '/images/club/channel_avatar.jpg',
      order: existing.length + 1
    };

    saveGalleryItem(completeItem);
    clearState(userId);

    await ctx.reply(
      `🎉 *Фотография успешно опубликована в галерее сайта!*\n\n` +
      `📸 *${completeItem.title}*\n` +
      `🏷️ ${completeItem.badge}\n` +
      `📝 ${completeItem.caption}`,
      { parse_mode: 'Markdown', reply_markup: getGalleryPostEditKeyboard(completeItem.id) }
    );
    return;
  }

  // Default answer
  await ctx.reply(
    `Выберите действие в меню или отправьте команду /menu:`,
    { reply_markup: getMainMenuKeyboard() }
  );
});

bot.callbackQuery('ann_skip_photo', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.chat?.id || 0;
  const state = getState(userId);

  if (state.stage === 'ann_photo') {
    const completeAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: state.draft.title || 'Анонс',
      text: state.draft.text || '',
      tag: state.draft.tag || 'Событие',
      date: new Date().toISOString().split('T')[0] ?? '',
      active: true
    };

    saveAnnouncement(completeAnn);
    clearState(userId);

    await ctx.reply(
      `🎉 *Анонс опубликован на сайте!*\n\n` +
      `📢 *${completeAnn.title}*\n` +
      `🏷️ ${completeAnn.tag}\n\n` +
      `${completeAnn.text}`,
      { parse_mode: 'Markdown', reply_markup: getAnnouncementPostEditKeyboard(completeAnn.id) }
    );
  }
});

// ==========================================
// 8. TELEGRAM CHANNEL SYNC (@dusha_avalon)
// ==========================================

// Broadcast announcement from Bot to Channel
bot.callbackQuery(/^ann_broadcast_(.+)$/, async (ctx) => {
  const annId = ctx.match[1];
  const ann = getAnnouncements().find(a => a.id === annId);
  if (!ann) {
    await ctx.answerCallbackQuery('Анонс не найден');
    return;
  }

  await ctx.answerCallbackQuery('Публикую в канал @dusha_avalon...');
  try {
    const postCaption =
      `📢 *${ann.title}*\n` +
      `🏷️ #${ann.tag.replace(/[\s-]+/g, '_')}\n\n` +
      `${ann.text}\n\n` +
      `🌐 avalon.tonivecher.online`;

    const channelKb = new InlineKeyboard()
      .url('🌐 Открыть сайт', 'https://avalon.tonivecher.online');

    let sentMsg: any;
    if (ann.photo) {
      sentMsg = await bot.api.sendPhoto(CHANNEL_ID, resolvePhotoSource(ann.photo), {
        caption: postCaption,
        parse_mode: 'Markdown',
        reply_markup: channelKb
      });
    } else {
      sentMsg = await bot.api.sendMessage(CHANNEL_ID, postCaption, {
        parse_mode: 'Markdown',
        reply_markup: channelKb
      });
    }

    if (sentMsg?.message_id) {
      ann.tgMessageId = sentMsg.message_id;
      ann.source = 'bot';
      saveAnnouncement(ann);
    }

    await ctx.reply(`✅ Анонс *«${ann.title}»* успешно отправлен в канал @dusha_avalon!`, {
      parse_mode: 'Markdown',
      reply_markup: getAnnouncementPostEditKeyboard(ann.id)
    });
  } catch (err: any) {
    console.error('Failed to post to channel:', err);
    await ctx.reply(
      `⚠️ Не удалось опубликовать в канал: ${err.message}\n\n` +
      `_Убедитесь, что бот @dusha_avalon_bot добавлен администратором в канал @dusha_avalon с правом публикации сообщений._`,
      { parse_mode: 'Markdown', reply_markup: getAnnouncementPostEditKeyboard(ann.id) }
    );
  }
});

function parseChannelPostContent(rawText: string): { title: string; tag: string; text: string } {
  if (!rawText) {
    return {
      title: 'Событие клуба',
      tag: 'Клуб',
      text: 'Новое обновление из Telegram-канала ТСК «Авалон».'
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const lower = rawText.toLowerCase();

  let tag = 'Событие';
  if (lower.includes('турнир') || lower.includes('кубок') || lower.includes('первенство') || lower.includes('соревнован')) {
    tag = 'Турнир';
  } else if (lower.includes('сбор') || lower.includes('интенсив') || lower.includes('прогон')) {
    tag = 'Сборы';
  } else if (lower.includes('мастер-класс') || lower.includes('семинар')) {
    tag = 'Мастер-класс';
  } else if (lower.includes('внимание') || lower.includes('отмена') || lower.includes('важно') || lower.includes('расписани')) {
    tag = 'Внимание';
  } else if (lower.includes('набор') || lower.includes('пробн') || lower.includes('запись')) {
    tag = 'Набор';
  } else if (lower.includes('поздравл') || lower.includes('место') || lower.includes('побед') || lower.includes('финал')) {
    tag = 'Результаты';
  }

  let title = lines[0] || 'Событие клуба';
  if (title.length > 75) {
    const match = title.match(/^(.{20,70})[.!?\n]/);
    if (match) {
      title = match[1].trim();
    } else {
      title = title.slice(0, 70).trim() + '...';
    }
  }

  let bodyText = rawText;
  if (lines.length > 1 && lines[0] === title) {
    bodyText = lines.slice(1).join('\n\n');
  }

  return { title, tag, text: bodyText };
}

async function processChannelPost(msg: any, isEdit = false) {
  const chatId = msg.chat?.id;
  const username = msg.chat?.username;
  if (chatId !== CHANNEL_ID && username !== CHANNEL_USERNAME) {
    return;
  }

  const rawText = (msg.text || msg.caption || '').trim();
  if (!rawText && !msg.photo) {
    return;
  }

  const existingAnnouncements = getAnnouncements();
  const existing = existingAnnouncements.find(a => a.tgMessageId === msg.message_id);

  if (existing && !isEdit) {
    return; // Ignore duplicate
  }

  let photoUrl: string | undefined;
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    try {
      photoUrl = await downloadTelegramPhoto(largestPhoto.file_id, 'announcements');
    } catch (err) {
      console.error('Failed to download channel post photo:', err);
    }
  }

  const parsed = parseChannelPostContent(rawText);

  const ann: Announcement = {
    id: existing ? existing.id : `ann-ch-${msg.message_id}`,
    title: parsed.title,
    text: parsed.text,
    tag: parsed.tag,
    date: new Date(msg.date * 1000).toISOString().split('T')[0] ?? '',
    photo: photoUrl || existing?.photo,
    active: true,
    tgMessageId: msg.message_id,
    source: 'channel'
  };

  saveAnnouncement(ann);
  console.log(`[Channel Sync] Post #${msg.message_id} synced to website as announcement: "${ann.title}"`);

  const adminMsg = isEdit
    ? `✏️ *Пост в канале @dusha_avalon обновлен*\n\n` +
      `Изменения автоматически применены на сайте:\n` +
      `📢 *«${ann.title}»*\n` +
      `🏷️ ${ann.tag}\n\n` +
      `${ann.text}`
    : `🚀 *Новый пост в канале @dusha_avalon опубликован на сайте!*\n\n` +
      `📢 *«${ann.title}»*\n` +
      `🏷️ ${ann.tag}\n\n` +
      `${ann.text}`;

  const adminKb = new InlineKeyboard()
    .text('✏️ Редактировать', `ann_edit_${ann.id}`)
    .text('🗑️ Снять с сайта', `ann_del_${ann.id}`)
    .row()
    .url('🌐 Открыть сайт', 'https://avalon.tonivecher.online');

  for (const adminId of adminIds) {
    try {
      if (ann.photo) {
        await bot.api.sendPhoto(adminId, resolvePhotoSource(ann.photo), {
          caption: adminMsg,
          parse_mode: 'Markdown',
          reply_markup: adminKb
        });
      } else {
        await bot.api.sendMessage(adminId, adminMsg, {
          parse_mode: 'Markdown',
          reply_markup: adminKb
        });
      }
    } catch (e) {
      // ignore
    }
  }
}

// Channel listeners
bot.on('channel_post', async (ctx) => {
  await processChannelPost(ctx.channelPost, false);
});

bot.on('edited_channel_post', async (ctx) => {
  await processChannelPost(ctx.editedChannelPost, true);
});

// Start bot polling
bot.start({
  allowed_updates: ['message', 'callback_query', 'channel_post', 'edited_channel_post'],
  onStart: async (info) => {

    console.log(`Telegram Bot @${info.username} CMS successfully started!`);
    try {
      await bot.api.setMyCommands([
        { command: 'menu', description: '🎛️ Главное меню CMS' },
        { command: 'start', description: '🚀 Перезапустить / главное меню' },
        { command: 'cancel', description: '❌ Отменить текущее действие' },
        { command: 'auth', description: '🔑 Авторизация наставника' },
      ]);
    } catch (e) {
      console.warn('Failed to register bot commands:', e);
    }
  }
});

// ==========================================
// 7. HTTP SERVER (Bun.serve)
// ==========================================

Bun.serve({
  port: Number(PORT),
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Serve uploaded files
    if (url.pathname.startsWith('/uploads/')) {
      const relPath = url.pathname.replace('/uploads/', '');
      const rootPath = path.join(rootUploadsDir, relPath);
      const localPath = path.join(localUploadsDir, relPath);

      if (fs.existsSync(rootPath)) {
        return new Response(Bun.file(rootPath), { headers: corsHeaders });
      } else if (fs.existsSync(localPath)) {
        return new Response(Bun.file(localPath), { headers: corsHeaders });
      }
      return new Response('File not found', { status: 404, headers: corsHeaders });
    }

    // Full website content endpoint
    if (url.pathname === '/api/content') {
      const content = getContent();
      return new Response(JSON.stringify(content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Single section endpoints
    if (url.pathname === '/api/status') {
      const status = getHallStatus();
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/coaches') {
      return new Response(JSON.stringify(getCoaches()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/schedule') {
      return new Response(JSON.stringify(getSchedule()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/announcements') {
      return new Response(JSON.stringify(getAnnouncements()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/gallery') {
      return new Response(JSON.stringify(getGallery()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'avalon-cms-backend',
        hallStatus: getHallStatus(),
        coachesCount: getCoaches().length,
        announcementsCount: getAnnouncements().length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lead capture from website forms
    if (url.pathname === '/api/leads' && req.method === 'POST') {
      try {
        const body = (await req.json()) as Record<string, any>;
        const { parentName, childName, phone, age, experience, goal } = body;

        const leadMessage =
          `🔥 *НОВАЯ ЗАЯВКА С САЙТА AVALON*\n\n` +
          `👤 *Родитель:* ${parentName || 'Не указано'}\n` +
          `👧 *Ребенок:* ${childName || 'Не указано'} (${age || '-'})\n` +
          `📞 *Телефон:* \`${phone}\`\n` +
          `🎯 *Опыт:* ${experience || '-'}\n` +
          `💡 *Цель:* ${goal || '-'}\n\n` +
          `_Отправлено с формы сайта avalon.tonivecher.online_`;

        const cleanPhone = (phone || '').replace(/\D/g, '');
        const leadKeyboard = new InlineKeyboard()
          .url('💬 WhatsApp', `https://wa.me/${cleanPhone}`)
          .url('📞 Позвонить', `tel:${cleanPhone}`);

        for (const adminId of adminIds) {
          try {
            await bot.api.sendMessage(adminId, leadMessage, {
              parse_mode: 'Markdown',
              reply_markup: leadKeyboard
            });
          } catch (e) {
            console.error(`Failed to send lead notification to ${adminId}:`, e);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        console.error('Lead error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Avalon Club CMS Backend API is running', {
      status: 200,
      headers: corsHeaders
    });
  }
});

console.log(`Avalon CMS backend HTTP server listening on http://127.0.0.1:${PORT}`);
