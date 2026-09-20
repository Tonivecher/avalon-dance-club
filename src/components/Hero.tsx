import React from 'react';
import { ArrowRight, Bell } from 'lucide-react';
import { REAL_PHOTOS } from '../data/clubData';
import type { AnnouncementData, HallStatusData } from '../data/useClubContent';

interface HeroProps {
  onOpenForm: () => void;
  announcements?: AnnouncementData[];
  hallStatus?: HallStatusData;
}

export const Hero: React.FC<HeroProps> = ({ onOpenForm, announcements, hallStatus }) => {
  const activeAnn = announcements?.find(a => a.active);

  return (
    <section className="relative min-h-[92vh] sm:min-h-[88vh] flex items-center justify-center pt-28 pb-20 overflow-hidden bg-[#090A0E]">
      {/* Background Palace Image with cinematic nocturnal overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={REAL_PHOTOS.usadbaMain}
          alt="Усадьба Свиблово, бальный зал ТСК Авалон"
          className="w-full h-full object-cover object-center scale-105 filter brightness-90 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/80 to-[#090A0E]/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center text-[#F8F6F0]">
        {/* Top Provenance Tag with Official Club Logo */}
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#161B26]/80 backdrop-blur-md border border-[#D8BA7A]/30 text-[11px] font-sans font-medium tracking-[0.2em] uppercase text-[#EBD8B0] mb-6 shadow-lg">
          <img
            src="/images/club/logo_round_128.png"
            alt="Эмблема ТСК Авалон"
            className="w-5 h-5 rounded-full shrink-0 border border-[#D8BA7A]/40"
          />
          <span>ТСК «АВАЛОН» • УСАДЬБА СВИБЛОВО • М. БОТАНИЧЕСКИЙ САД</span>
        </div>

        {/* Live Announcement or Hall Status Pill */}
        {activeAnn ? (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#161B26]/90 border border-[#D8BA7A]/40 text-[#EBD8B0] text-xs sm:text-sm font-medium backdrop-blur-md shadow-md">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wider uppercase bg-[#D8BA7A] text-[#090A0E] shrink-0">
                {activeAnn.tag}
              </span>
              <span className="truncate max-w-md">{activeAnn.title}</span>
            </div>
          </div>
        ) : hallStatus?.status && hallStatus.status !== 'Зал открыт • Занятия строго по расписанию' ? (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161B26]/90 border border-[#D8BA7A]/30 text-[#EBD8B0] text-xs font-sans tracking-wide">
              <Bell className="w-3.5 h-3.5 text-[#D8BA7A] shrink-0" />
              <span>{hallStatus.status}</span>
            </div>
          </div>
        ) : null}

        {/* Headline: Monumental Serif with Champagne Accent */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-serif font-normal tracking-tight leading-[1.08] text-[#F8F6F0]">
          Спортивные бальные танцы <br />
          <span className="italic font-serif font-light text-[#D8BA7A]">в исторической усадьбе</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-[#A3A8B5] max-w-2xl mx-auto leading-relaxed font-normal">
          Школа танца под руководством Анны Турчиной. Набор детей от 4 лет, 
          подготовка конкурсных пар и выезды на официальные турниры.
        </p>

        {/* Buttons - No Sparkles slop, pure luxury touch */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onOpenForm}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] hover:from-[#EBD8B0] hover:to-[#D8BA7A] text-[#090A0E] font-semibold text-xs sm:text-sm uppercase tracking-[0.16em] shadow-[0_8px_30px_rgba(216,186,122,0.25)] hover:shadow-[0_12px_36px_rgba(216,186,122,0.35)] transition-all flex items-center justify-center gap-2.5 group active:scale-95 cursor-pointer"
          >
            <span>Записаться на пробный урок</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#schedule"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-[#F8F6F0] font-medium text-xs sm:text-sm uppercase tracking-[0.16em] border border-white/[0.12] transition-all flex items-center justify-center"
          >
            <span>Расписание занятий</span>
          </a>
        </div>

        {/* Provenance Fact Counters */}
        <div className="mt-16 pt-10 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-serif text-3xl sm:text-4xl font-light text-[#D8BA7A]">1713 год</div>
            <div className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-[#A3A8B5] mt-1.5">Ансамбль Усадьбы</div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl font-light text-[#F8F6F0]">от 4 лет</div>
            <div className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-[#A3A8B5] mt-1.5">Начальные группы</div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl font-light text-[#F8F6F0]">100%</div>
            <div className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-[#A3A8B5] mt-1.5">Дубовый массив паркета</div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl font-light text-[#D8BA7A]">15+</div>
            <div className="text-[10px] sm:text-[11px] font-sans font-medium tracking-[0.18em] uppercase text-[#A3A8B5] mt-1.5">Турниров в сезоне</div>
          </div>
        </div>
      </div>
    </section>
  );
};
