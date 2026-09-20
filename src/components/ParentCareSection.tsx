import React from 'react';
import { Bus, Scissors, HeartHandshake, Sparkles, CheckCircle2 } from 'lucide-react';

export const ParentCareSection: React.FC = () => {
  const perks = [
    {
      icon: <Bus className="w-6 h-6 text-[#C45935]" />,
      title: 'Трансфер и сопровождение',
      desc: 'На турниры педагоги централизованно встречают детей у метро «Ботанический сад» (выход 5) и довозят до места проведения, организуя разминку и психологическую поддержку.'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#D4AF37]" />,
      title: 'Турнирные причёски на месте',
      desc: 'Наши сертифицированные стилисты (Катрин Жиро, Настя Гапон) готовят танцевальные пучки и лакировку прямо перед выходом на паркет — родителям не нужно искать сторонних мастеров.'
    },
    {
      icon: <Scissors className="w-6 h-6 text-[#0284C7]" />,
      title: 'Своё профессиональное ателье',
      desc: 'Швея клуба Александра Жарова работает в ведущем ателье танцевальной одежды: подгонка костюмов, пошив рейтинговых платьев со стразами Swarovski и консультации по регламенту ФТСР.'
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-[#15803D]" />,
      title: 'Здоровая атмосфера без буллинга',
      desc: 'В клубе «Душа/Авалон» победа достигается дисциплиной и любовью к делу, а не криками и давлением. Мы отмечаем дни рождения, дружим семьями и поддерживаем каждого ребенка.'
    }
  ];

  return (
    <section id="parents" className="py-20 sm:py-28 border-b border-[#E7E2DA] bg-[#FBF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFEA] border border-[#E7E2DA] text-xs font-mono uppercase tracking-wider text-[#78716C] mb-3">
            Сервис для родителей
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#1C1917] tracking-tight">
            Мы берем всю рутину на себя
          </h2>
          <p className="mt-3 text-[#78716C] text-sm sm:text-base leading-relaxed">
            Вам не придется искать стилистов в 6 утра, шить костюмы наугад или возить ребенка по пробкам на турниры в одиночку.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((p, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-[#E7E2DA] hover:border-[#C45935]/40 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#F3EFEA] flex items-center justify-center mb-5">
                  {p.icon}
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917] mb-2">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-[#E7E2DA] flex items-center gap-1.5 text-xs text-[#15803D] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Включено в экосистему</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
