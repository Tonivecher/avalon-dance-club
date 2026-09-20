import React from 'react';
import { REAL_PHOTOS } from '../data/clubData';
import type { GalleryData } from '../data/useClubContent';
import { Send } from 'lucide-react';

interface PhotoBentoProps {
  gallery?: GalleryData[];
}

export const PhotoBento: React.FC<PhotoBentoProps> = ({ gallery }) => {
  return (
    <section id="gallery" className="py-20 sm:py-28 bg-[#090A0E] border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#161B26] border border-[#D8BA7A]/30 text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D8BA7A]" />
              Хроника турниров и тренировок
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#F8F6F0] tracking-tight">
              События клуба <span className="italic font-light text-[#D8BA7A]">&</span> результаты
            </h2>
          </div>

          <a
            href="https://t.me/dusha_avalon"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-sans tracking-[0.15em] uppercase text-[#D8BA7A] hover:text-[#EBD8B0] transition-colors"
          >
            <Send className="w-4 h-4 text-[#D8BA7A]" />
            Канал клуба в Telegram →
          </a>
        </div>

        {/* Bento Grid with Double-Bezel frames and face-safe positioning */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
          {(gallery && gallery.length > 0 ? gallery : [
            {
              id: '1',
              photo: REAL_PHOTOS.arishaSeasonOpen,
              badge: '1 место и Суперкубок',
              category: 'Категория Н3',
              title: 'Арина открывает танцевальный сезон',
              caption: 'Самая юная участница в категории, победившая по итогам всех туров.'
            },
            {
              id: '2',
              photo: REAL_PHOTOS.usadbaFront,
              badge: 'Исторический зал',
              category: 'Усадьба Свиблово',
              title: 'Бальный зал Усадьбы Свиблово',
              caption: 'Москва, Лазоревый проезд, 15 (м. Ботанический сад)'
            },
            {
              id: '3',
              photo: REAL_PHOTOS.mishaArishaWin,
              badge: 'Конкурсная пара',
              category: 'Победы и финалы',
              title: 'Миша и Арина',
              caption: 'Победы и финалы на турнирах в Москве и Санкт-Петербурге'
            },
            {
              id: '4',
              photo: REAL_PHOTOS.tsaturyanCamp,
              badge: 'Сборы в Крокусе',
              category: 'Интенсив',
              title: 'Интенсив по латине',
              caption: 'Тренировки с чемпионом мира Арменом Цатуряном'
            },
            {
              id: '5',
              photo: REAL_PHOTOS.petyaMasha,
              badge: 'Взрослые ASM',
              category: 'Финалисты',
              title: 'Петя и Маша',
              caption: 'Финалисты официального первенства'
            },
            {
              id: '6',
              photo: REAL_PHOTOS.veraSolovtsova,
              badge: 'Категория Н2',
              category: 'Призеры',
              title: 'Вера Соловцова',
              caption: 'Выход из четвертьфинала на 2 призовое место'
            }
          ]).map((item, idx) => {
            const isLarge = idx === 0 || idx === 1;
            return (
              <div
                key={item.id || idx}
                className={`${
                  isLarge ? 'md:col-span-2 min-h-[340px] sm:min-h-[420px]' : 'col-span-1 min-h-[300px] sm:min-h-[340px]'
                } rounded-3xl overflow-hidden relative group border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 bg-[#11141C] flex flex-col justify-end shadow-[0_16px_40px_rgba(0,0,0,0.6)]`}
              >
                <img
                  src={item.photo}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
                />
                <div className="relative z-10 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/70 to-transparent flex flex-col justify-end p-6 sm:p-7 text-[#F8F6F0]">
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-sans font-medium tracking-[0.14em] uppercase bg-[#161B26]/90 text-[#D8BA7A] border border-[#D8BA7A]/30 backdrop-blur-md shadow-sm">
                      {item.badge}
                    </span>
                    {item.category && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-sans tracking-wider uppercase bg-black/50 text-[#A3A8B5] border border-white/[0.06] backdrop-blur-md">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-serif font-normal leading-tight text-[#F8F6F0] ${isLarge ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-xs sm:text-sm text-[#A3A8B5] mt-2 line-clamp-2 leading-relaxed">
                      {item.caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
