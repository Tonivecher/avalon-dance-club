import React from 'react';
import { REAL_PHOTOS } from '../data/clubData';
import { Trees, Building2, Compass } from 'lucide-react';

interface UsadbaGalleryProps {
  onOpenForm: () => void;
}

export const UsadbaGallery: React.FC<UsadbaGalleryProps> = ({ onOpenForm }) => {
  return (
    <section id="usadba" className="py-20 sm:py-28 bg-[#11141C] border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161B26] border border-[#D8BA7A]/30 text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] mb-3">
            Москва, Лазоревый проезд, 15
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-[#F8F6F0] tracking-tight">
            Бальный зал <span className="italic font-light text-[#D8BA7A]">в Усадьбе Свиблово</span>
          </h2>
          <p className="mt-3 text-[#A3A8B5] text-sm sm:text-base leading-relaxed">
            Занятия проходят в историческом дворцовом ансамбле XVIII века с классическим деревянным паркетом и парком на живописном берегу реки Яузы.
          </p>
        </div>

        {/* 4-Image Monograph Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <div className="rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 group shadow-xl bg-[#161B26]">
            <div className="h-72 overflow-hidden relative">
              <img
                src={REAL_PHOTOS.usadbaFacade}
                alt="Главный дворец Усадьбы Свиблово"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/40 to-transparent flex items-end p-5 text-[#F8F6F0]">
                <div>
                  <div className="font-serif text-lg font-normal text-[#F8F6F0]">Главный дворец</div>
                  <div className="text-[10px] text-[#D8BA7A] font-sans tracking-[0.15em] uppercase mt-0.5">Классицизм XVIII века</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 group shadow-xl bg-[#161B26]">
            <div className="h-72 overflow-hidden relative">
              <img
                src={REAL_PHOTOS.usadbaGarden}
                alt="Парк усадьбы у реки Яузы"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/40 to-transparent flex items-end p-5 text-[#F8F6F0]">
                <div>
                  <div className="font-serif text-lg font-normal text-[#F8F6F0]">Парк у реки Яузы</div>
                  <div className="text-[10px] text-[#D8BA7A] font-sans tracking-[0.15em] uppercase mt-0.5">ОФП и разминки на воздухе</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 group shadow-xl bg-[#161B26]">
            <div className="h-72 overflow-hidden relative">
              <img
                src={REAL_PHOTOS.usadbaMain}
                alt="Корпус и колоннада усадьбы"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/40 to-transparent flex items-end p-5 text-[#F8F6F0]">
                <div>
                  <div className="font-serif text-lg font-normal text-[#F8F6F0]">Бальный корпус</div>
                  <div className="text-[10px] text-[#D8BA7A] font-sans tracking-[0.15em] uppercase mt-0.5">Высота сводов более 5 метров</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#D8BA7A]/40 transition-all duration-500 group shadow-xl bg-[#161B26]">
            <div className="h-72 overflow-hidden relative">
              <img
                src={REAL_PHOTOS.usadbaWest}
                alt="Западный флигель усадьбы"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 filter brightness-95 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/40 to-transparent flex items-end p-5 text-[#F8F6F0]">
                <div>
                  <div className="font-serif text-lg font-normal text-[#F8F6F0]">Парковые аллеи</div>
                  <div className="text-[10px] text-[#D8BA7A] font-sans tracking-[0.15em] uppercase mt-0.5">10 минут от метро</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Concrete Features - Pure Luxury Finish */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-[#161B26] border border-white/[0.08] hover:border-[#D8BA7A]/30 transition-all flex items-start gap-4 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-[#11141C] border border-[#D8BA7A]/30 text-[#D8BA7A] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-base text-[#F8F6F0]">Дубовый массив паркета</div>
              <div className="text-xs text-[#A3A8B5] mt-1 leading-relaxed">
                Профессиональное амортизирующее танцевальное покрытие, сохраняющее здоровье суставов ребенка.
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#161B26] border border-white/[0.08] hover:border-[#D8BA7A]/30 transition-all flex items-start gap-4 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-[#11141C] border border-[#D8BA7A]/30 text-[#D8BA7A] flex items-center justify-center shrink-0">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-base text-[#F8F6F0]">Усадебный парк на Яузе</div>
              <div className="text-xs text-[#A3A8B5] mt-1 leading-relaxed">
                Регулярные разминки, сезонная общая физическая подготовка и кроссы на свежем воздухе.
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#161B26] border border-white/[0.08] hover:border-[#D8BA7A]/30 transition-all flex items-start gap-4 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-[#11141C] border border-[#D8BA7A]/30 text-[#D8BA7A] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="font-serif text-base text-[#F8F6F0]">10 минут от метро</div>
              <div className="text-xs text-[#A3A8B5] mt-1 leading-relaxed">
                Удобный подъезд и пешая доступность от станций «Ботанический сад» (МЦК) и «Свиблово».
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
