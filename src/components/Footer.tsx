import React from 'react';
import { Send, Phone, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#090A0E] text-[#F8F6F0] pt-20 pb-14 border-t border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-white/[0.08]">
          {/* Brand Provenance */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden p-0.5 border border-[#D8BA7A]/40 bg-[#161B26] shrink-0 shadow-md">
                <img
                  src="/images/club/logo_round_512.png"
                  alt="Логотип ТСК Авалон"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <div className="font-serif text-xl font-normal tracking-wide text-[#F8F6F0]">
                  ДУША <span className="text-[#D8BA7A]/80 font-light">/</span> АВАЛОН
                </div>
                <div className="text-[10px] font-sans text-[#A3A8B5] tracking-[0.2em] uppercase">
                  Танцевально-спортивный клуб в Усадьбе Свиблово
                </div>
              </div>
            </div>

            <p className="text-sm text-[#A3A8B5] max-w-sm leading-relaxed">
              Школа спортивного бального танца для детей от 4 лет, конкурсных пар и соло-спортсменов под руководством Анны Турчиной.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://t.me/dusha_avalon"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-full bg-[#161B26] hover:bg-gradient-to-r hover:from-[#D8BA7A] hover:to-[#C2A260] hover:text-[#090A0E] text-[#D8BA7A] text-xs font-sans tracking-[0.14em] uppercase font-medium flex items-center gap-2 border border-[#D8BA7A]/30 transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Канал @dusha_avalon</span>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] font-medium">
              Разделы
            </div>
            <ul className="space-y-2.5 text-xs font-sans tracking-wide text-[#A3A8B5]">
              <li><a href="#gallery" className="hover:text-[#D8BA7A] transition-colors">Кадры & Победы клуба</a></li>
              <li><a href="#usadba" className="hover:text-[#D8BA7A] transition-colors">Бальный зал Усадьбы</a></li>
              <li><a href="#schedule" className="hover:text-[#D8BA7A] transition-colors">Расписание тренировок</a></li>
              <li><a href="#coaches" className="hover:text-[#D8BA7A] transition-colors">Педагогический состав</a></li>
              <li><a href="#booking" className="hover:text-[#D8BA7A] transition-colors">Запись на просмотр</a></li>
            </ul>
          </div>

          {/* Contacts & Location */}
          <div className="md:col-span-4 space-y-3">
            <div className="text-[11px] font-sans uppercase tracking-[0.2em] text-[#D8BA7A] font-medium">
              Адрес и наставники
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-[#A3A8B5]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#D8BA7A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#F8F6F0] font-normal">Усадьба Свиблово</strong><br />
                  Москва, Лазоревый проезд, дом 15<br />
                  <span className="text-xs text-[#A3A8B5]/80">м. Ботанический сад (МЦК) / м. Свиблово</span>
                </span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Phone className="w-4 h-4 text-[#D8BA7A] shrink-0" />
                <span>Руководитель: <strong className="text-[#F8F6F0] font-normal">Анна Турчина</strong></span>
              </div>
            </div>

            <div className="pt-3 text-xs text-[#A3A8B5]/80 leading-relaxed">
              Тренировочные дни: Понедельник, Среда, Четверг, Пятница, Суббота.<br />
              Турнирные выезды по выходным в Москве и других городах.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A8B5]/70">
          <div>
            © {new Date().getFullYear()} ТСК «Авалон». Все права защищены.
          </div>
          <div>
            <span>Школа спортивного бального танца</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
