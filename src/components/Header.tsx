import React, { useState, useEffect } from 'react';
import { Send, Menu, X, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  onOpenQuiz: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuiz }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
      {/* Floating Glass Island */}
      <div
        className={`pointer-events-auto max-w-6xl mx-auto transition-all duration-500 rounded-full border ${
          isScrolled
            ? 'bg-[#090A0E]/92 backdrop-blur-2xl border-white/[0.12] shadow-[0_20px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] py-2.5 px-4 sm:px-6'
            : 'bg-[#090A0E]/75 backdrop-blur-xl border-white/[0.08] shadow-[0_12px_30px_rgba(0,0,0,0.6)] py-3 px-4 sm:px-6'
        } flex items-center justify-between gap-4`}
      >
        {/* Brand Block */}
        <a href="#" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden p-0.5 border border-[#D8BA7A]/40 bg-[#161B26] shrink-0 group-hover:border-[#D8BA7A] transition-colors shadow-md">
            <img
              src="/images/club/logo_round_512.png"
              alt="Логотип ТСК Авалон"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-serif text-base sm:text-lg font-normal tracking-wide text-[#F8F6F0] leading-tight group-hover:text-[#D8BA7A] transition-colors">
                ТСК «АВАЛОН»
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-sans tracking-[0.18em] uppercase text-[#A3A8B5] leading-tight">
              Усадьба Свиблово • Москва
            </span>
          </div>
        </a>

        {/* Center Editorial Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-[11px] font-sans font-medium tracking-[0.14em] uppercase text-[#A3A8B5]">
          <a
            href="#gallery"
            className="hover:text-[#F8F6F0] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#D8BA7A] hover:after:w-full after:transition-all"
          >
            Кадры & Победы
          </a>
          <a
            href="#usadba"
            className="hover:text-[#F8F6F0] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#D8BA7A] hover:after:w-full after:transition-all"
          >
            Бальный зал
          </a>
          <a
            href="#schedule"
            className="hover:text-[#F8F6F0] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#D8BA7A] hover:after:w-full after:transition-all"
          >
            Расписание
          </a>
          <a
            href="#coaches"
            className="hover:text-[#F8F6F0] transition-colors py-1 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#D8BA7A] hover:after:w-full after:transition-all"
          >
            Наставники
          </a>
        </nav>

        {/* Right Action Block */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <a
            href="https://t.me/dusha_avalon"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-[#161B26] hover:bg-[#1C2331] border border-white/[0.08] hover:border-[#D8BA7A]/40 text-[#D8BA7A] flex items-center justify-center transition-all shadow-sm"
            title="Официальный Telegram-канал @dusha_avalon"
          >
            <Send className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onOpenQuiz}
            className="px-5 py-2 rounded-full text-[11px] font-sans font-semibold tracking-[0.14em] uppercase bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] hover:from-[#EBD8B0] hover:to-[#D8BA7A] text-[#090A0E] shadow-[0_4px_16px_rgba(216,186,122,0.25)] hover:shadow-[0_6px_22px_rgba(216,186,122,0.35)] transition-all active:scale-95 cursor-pointer"
          >
            Пробный урок
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2 shrink-0">
          <button
            onClick={onOpenQuiz}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-sans font-semibold tracking-wider uppercase bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] text-[#090A0E] shadow-sm active:scale-95"
          >
            Запись
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-8 h-8 rounded-full bg-[#161B26] border border-white/[0.08] text-[#F8F6F0] flex items-center justify-center transition-colors"
            aria-label="Меню навигации"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#D8BA7A]" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto max-w-md mx-auto mt-2.5 rounded-3xl bg-[#090A0E]/95 backdrop-blur-2xl border border-white/[0.1] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.9)] text-[#F8F6F0] animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col gap-3 text-xs font-sans tracking-[0.16em] uppercase font-medium">
            <a
              href="#gallery"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl text-[#A3A8B5] hover:text-[#F8F6F0] hover:bg-white/[0.04] transition-colors flex items-center justify-between"
            >
              <span>Кадры & Победы</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D8BA7A]" />
            </a>
            <a
              href="#usadba"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl text-[#A3A8B5] hover:text-[#F8F6F0] hover:bg-white/[0.04] transition-colors flex items-center justify-between"
            >
              <span>Бальный зал в Усадьбе</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D8BA7A]" />
            </a>
            <a
              href="#schedule"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl text-[#A3A8B5] hover:text-[#F8F6F0] hover:bg-white/[0.04] transition-colors flex items-center justify-between"
            >
              <span>Расписание занятий</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D8BA7A]" />
            </a>
            <a
              href="#coaches"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 px-3 rounded-xl text-[#A3A8B5] hover:text-[#F8F6F0] hover:bg-white/[0.04] transition-colors flex items-center justify-between"
            >
              <span>Педагогический состав</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D8BA7A]" />
            </a>
            <div className="pt-2 border-t border-white/[0.08]">
              <a
                href="https://t.me/dusha_avalon"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-sans font-medium tracking-wider bg-[#161B26] text-[#D8BA7A] border border-[#D8BA7A]/30 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Канал клуба @dusha_avalon</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
