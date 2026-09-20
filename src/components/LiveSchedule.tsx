import React, { useState } from 'react';
import { CLUB_SCHEDULE, type DaySchedule } from '../data/clubData';
import { Clock, MapPin, AlertCircle, Sparkles, Building } from 'lucide-react';

interface LiveScheduleProps {
  onOpenQuiz: () => void;
  schedule?: Record<number, DaySchedule>;
}

export const LiveSchedule: React.FC<LiveScheduleProps> = ({ onOpenQuiz, schedule = CLUB_SCHEDULE }) => {
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay();
    return schedule[today] ? today : 1;
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'kids' | 'junior' | 'pro' | 'choreo'>('all');

  const daysOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun
  const currentDayData = schedule[selectedDay];

  const filteredItems = currentDayData?.items.filter(item => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  }) || [];

  const categoryLabels = {
    all: 'Все направления',
    kids: 'Школа танца (4–7 лет)',
    junior: 'Конкурсные пары',
    pro: 'PRO & Старшие',
    choreo: 'Балет, джаз, ОФП'
  };

  return (
    <section id="schedule" className="py-20 sm:py-28 border-b border-white/[0.08] bg-[#090A0E] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#161B26] border border-[#D8BA7A]/30 text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D8BA7A]" />
              График тренировок
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#F8F6F0] tracking-tight">
              Расписание <span className="italic font-light text-[#D8BA7A]">занятий</span>
            </h2>
            <p className="mt-3 text-[#A3A8B5] text-sm sm:text-base max-w-xl leading-relaxed">
              Сетка групповых тренировок на текущий сезон. По вопросам распределения в группы обращайтесь к наставникам клуба.
            </p>
          </div>

          {/* Hall location meta badge */}
          <div className="p-4 rounded-3xl bg-[#11141C] border border-white/[0.08] shadow-xl flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#161B26] border border-[#D8BA7A]/30 text-[#D8BA7A] flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-serif text-sm text-[#F8F6F0]">Бальный зал Усадьбы Свиблово</div>
              <div className="text-[#A3A8B5] text-[11px] tracking-wide mt-0.5">Лазоревый проезд, 15 (м. Ботанический сад)</div>
            </div>
          </div>
        </div>

        {/* Days of Week Tab Bar */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 mb-8">
          {daysOrder.map((dayIdx) => {
            const day = schedule[dayIdx];
            if (!day) return null;
            const isToday = new Date().getDay() === dayIdx;
            const isSelected = selectedDay === dayIdx;

            return (
              <button
                key={dayIdx}
                onClick={() => setSelectedDay(dayIdx)}
                className={`py-3.5 px-2 rounded-2xl border transition-all text-center relative cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#D8BA7A] to-[#C2A260] text-[#090A0E] border-[#D8BA7A] shadow-[0_8px_20px_rgba(216,186,122,0.25)] font-semibold'
                    : 'bg-[#11141C] text-[#A3A8B5] border-white/[0.08] hover:border-[#D8BA7A]/40 hover:text-[#F8F6F0]'
                }`}
              >
                <div className="text-xs sm:text-sm font-sans tracking-wider uppercase">
                  {day.shortName}
                </div>
                <div className={`text-[10px] sm:text-[11px] hidden sm:block truncate mt-0.5 ${isSelected ? 'text-[#090A0E]/80' : 'text-[#A3A8B5]/70'}`}>
                  {day.dayName}
                </div>
                {isToday && (
                  <span className={`absolute -top-1 right-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-[#090A0E]' : 'bg-emerald-400'}`} title="Сегодня" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-white/[0.08]">
          {(['all', 'kids', 'junior', 'pro', 'choreo'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans tracking-wider transition-all cursor-pointer ${
                activeFilter === filterKey
                  ? 'bg-[#161B26] text-[#D8BA7A] border border-[#D8BA7A]/50 font-medium shadow-md'
                  : 'bg-[#11141C] text-[#A3A8B5] border border-white/[0.06] hover:border-white/20 hover:text-[#F8F6F0]'
              }`}
            >
              {categoryLabels[filterKey]}
            </button>
          ))}
        </div>

        {/* Day Announcement */}
        {currentDayData?.announcement && (
          <div className="mb-6 p-4 rounded-2xl bg-[#161B26] border border-[#D8BA7A]/30 text-xs sm:text-sm text-[#EBD8B0] flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#D8BA7A]" />
            <span>{currentDayData.announcement}</span>
          </div>
        )}

        {/* Schedule List */}
        <div className="space-y-3.5">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-[#11141C] border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
              >
                <div className="flex items-start gap-4">
                  <div className="px-3.5 py-2 rounded-xl bg-[#161B26] border border-[#D8BA7A]/30 font-sans font-semibold text-xs sm:text-sm tracking-wider text-[#D8BA7A] shrink-0">
                    {item.time}
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-serif font-normal text-[#F8F6F0] group-hover:text-[#D8BA7A] transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#A3A8B5]">
                      <span>Наставник: <strong className="text-[#F8F6F0] font-normal">{item.coach}</strong></span>
                      <span className="text-white/20">•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D8BA7A]" /> {item.room}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onOpenQuiz}
                  className="self-start sm:self-center px-5 py-2 rounded-full text-xs font-sans uppercase tracking-[0.14em] font-medium bg-[#161B26] hover:bg-gradient-to-r hover:from-[#D8BA7A] hover:to-[#C2A260] hover:text-[#090A0E] text-[#D8BA7A] border border-[#D8BA7A]/30 transition-all cursor-pointer"
                >
                  Записаться в группу
                </button>
              </div>
            ))
          ) : (
            <div className="p-14 text-center bg-[#11141C] rounded-3xl border border-white/[0.08]">
              <Clock className="w-8 h-8 text-[#A3A8B5]/40 mx-auto mb-3" />
              <p className="text-[#A3A8B5] text-sm">
                В этот день по выбранному направлению тренировок нет. Выберите другой день недели или фильтр.
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-5 rounded-2xl bg-[#11141C] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A8B5]">
          <span>
            Занятия проводятся строго по расписанию. Индивидуальные уроки согласовываются персонально с наставником.
          </span>
          <button
            onClick={onOpenQuiz}
            className="text-[#D8BA7A] hover:text-[#EBD8B0] font-medium flex items-center gap-1.5 shrink-0 uppercase tracking-wider cursor-pointer"
          >
            <span>Задать вопрос о расписании →</span>
          </button>
        </div>
      </div>
    </section>
  );
};
