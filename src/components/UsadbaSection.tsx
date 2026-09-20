import React from 'react';
import { Compass, Wind, ShieldCheck, Sun, Trees, ArrowRight } from 'lucide-react';

interface UsadbaSectionProps {
  onOpenQuiz: () => void;
}

export const UsadbaSection: React.FC<UsadbaSectionProps> = ({ onOpenQuiz }) => {
  return (
    <section id="usadba" className="py-20 sm:py-28 border-b border-[#E7E2DA] bg-[#FBF9F5] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Kicker */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3EFEA] border border-[#E7E2DA] text-xs font-mono uppercase tracking-wider text-[#78716C] mb-3">
            <Compass className="w-3.5 h-3.5 text-[#C45935]" />
            Редчайшая локация Москвы
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#1C1917] tracking-tight">
            Бальный зал в Усадьбе Свиблово
          </h2>
          <p className="mt-3 text-[#78716C] text-sm sm:text-base leading-relaxed">
            Вместо душных подвалов и безликих фитнес-клубов — исторический особняк XVIII века с паркетным полом, 
            высокими сводчатыми потолками и тихим парком у реки Яузы.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="p-8 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#C45935]/10 text-[#C45935] flex items-center justify-center mb-6">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C1917] mb-3">
                Акустика и чистый паркет
              </h3>
              <p className="text-sm text-[#78716C] leading-relaxed">
                Настоящий танцевальный зал с естественным дневным светом через арочные окна, деревянным паркетом 
                с правильной амортизацией суставов и пятиметровыми потолками для свободного дыхания во время интенсивных прогонов.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E7E2DA] text-xs font-mono text-[#948254]">
              Безопасно для детских коленей и спины
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#15803D]/10 text-[#15803D] flex items-center justify-center mb-6">
                <Trees className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C1917] mb-3">
                Парк и кардио у Яузы
              </h3>
              <p className="text-sm text-[#78716C] leading-relaxed">
                Танцевальный спорт требует колоссальной выносливости. По пятницам наши спортсмены выходят 
                на пробежки и прыжковую подготовку со скакалками в живописный парк усадьбы прямо вдоль набережной реки.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E7E2DA] text-xs font-mono text-[#948254]">
              ОФП и выносливость на свежем воздухе
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-[#E7E2DA] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#1C1917] mb-3">
                Закрытая охраняемая среда
              </h3>
              <p className="text-sm text-[#78716C] leading-relaxed">
                Территория усадебного комплекса закрыта от посторонних. Родители могут спокойно ожидать детей 
                на территории или прогуливаться по тенистым аллеям. 7 минут от метро Ботанический сад и Свиблово.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E7E2DA] text-xs font-mono text-[#948254]">
              Спокойствие и безопасность 100%
            </div>
          </div>
        </div>

        {/* Visual Callout */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#1C1917] text-white relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-mono uppercase tracking-wider text-[#C45935] font-semibold">
              Приглашение для родителей
            </span>
            <h3 className="text-2xl sm:text-4xl font-serif font-bold mt-2 leading-tight">
              Приходите на ознакомительную экскурсию и просмотр
            </h3>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Познакомьтесь с руководителем Анной Турчиной, посмотрите на зал и атмосферу тренировок, 
              а ребенок сделает свои первые пробные танцевальные шаги.
            </p>
          </div>

          <button
            onClick={onOpenQuiz}
            className="px-7 py-4 rounded-xl text-sm font-semibold bg-[#C45935] hover:bg-[#A53E1E] text-white transition-all shadow-md flex items-center gap-2 shrink-0 active:scale-95"
          >
            <span>Записаться на экскурсию и просмотр</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
