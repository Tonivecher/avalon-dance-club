import React from 'react';
import { COACHES_STAFF } from '../data/clubData';
import type { CoachData } from '../data/useClubContent';

interface CoachesSectionProps {
  onOpenForm: () => void;
  coaches?: CoachData[];
}

export const CoachesSection: React.FC<CoachesSectionProps> = ({ onOpenForm, coaches = COACHES_STAFF }) => {
  return (
    <section id="coaches" className="py-20 sm:py-28 bg-[#11141C] border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#161B26] border border-[#D8BA7A]/30 text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D8BA7A]" />
              Педагогический состав
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#F8F6F0] tracking-tight">
              Наставники <span className="italic font-light text-[#D8BA7A]">клуба</span>
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-[#A3A8B5] max-w-md leading-relaxed">
            Преподаватели спортивного бального танца, мастера спорта и действующие судьи танцевальных федераций.
          </p>
        </div>

        {/* Coaches Cards Grid with Museum Framing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {coaches.map((coach, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#161B26] border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 shadow-xl flex flex-col justify-between group"
            >
              <div>
                {/* Photo with face-safe portrait aspect ratio and top alignment */}
                <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/5] bg-[#11141C] border border-white/[0.06]">
                  <img
                    src={coach.photo}
                    alt={coach.name}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
                  />
                  <div className="absolute top-3.5 left-3.5">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-sans font-medium tracking-wider uppercase bg-[#090A0E]/90 text-[#D8BA7A] border border-[#D8BA7A]/30 backdrop-blur-md">
                      {coach.badge}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-sans text-[#D8BA7A] font-medium uppercase tracking-[0.16em]">
                  {coach.role}
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#F8F6F0] mt-1.5 group-hover:text-[#D8BA7A] transition-colors">
                  {coach.name}
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-[#A3A8B5] leading-relaxed">
                  {coach.desc}
                </p>
              </div>

              {/* Tags & Action */}
              <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {coach.specs.map((spec, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-3 py-1 rounded-full bg-[#11141C] text-[#A3A8B5] text-[10px] font-sans tracking-wider border border-white/[0.06]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-14 p-8 rounded-3xl bg-[#161B26] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="text-center sm:text-left">
            <h4 className="font-serif text-xl sm:text-2xl font-normal text-[#F8F6F0]">
              Хотите прийти на просмотр к наставникам?
            </h4>
            <p className="text-xs sm:text-sm text-[#A3A8B5] mt-1">
              Педагоги определят танцевальные данные ребенка и подскажут расписание подходящей группы.
            </p>
          </div>
          <button
            onClick={onOpenForm}
            className="shrink-0 px-7 py-3 rounded-full bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] hover:from-[#EBD8B0] hover:to-[#D8BA7A] text-[#090A0E] text-xs font-sans font-semibold tracking-[0.16em] uppercase transition-all shadow-[0_4px_16px_rgba(216,186,122,0.25)] cursor-pointer active:scale-95"
          >
            Записаться на просмотр →
          </button>
        </div>
      </div>
    </section>
  );
};
