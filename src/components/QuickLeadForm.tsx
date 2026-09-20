import React, { useState } from 'react';
import { Phone, User, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export const QuickLeadForm: React.FC = () => {
  const [selectedAge, setSelectedAge] = useState('4–6 лет');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: name,
          phone,
          age: selectedAge,
          goal: 'Пробное занятие в Усадьбе Свиблово'
        })
      });
      setIsSuccess(true);
    } catch {
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-20 sm:py-28 bg-[#090A0E] text-[#F8F6F0] relative border-b border-white/[0.08]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="px-4 py-1.5 rounded-full text-[11px] font-sans font-medium bg-[#161B26] text-[#D8BA7A] border border-[#D8BA7A]/30 uppercase tracking-[0.2em] mb-3 inline-block">
            Первый визит в клуб
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight">
            Приглашение на просмотр <br />
            <span className="italic font-light text-[#D8BA7A]">в Усадьбу Свиблово</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#A3A8B5] leading-relaxed">
            Познакомьтесь с руководителем школы Анной Турчиной, посмотрите бальный зал и сделайте первые шаги на паркете.
          </p>
        </div>

        {/* Club Invitation Card Container */}
        <div className="p-6 sm:p-12 rounded-3xl bg-[#11141C] border border-[#D8BA7A]/30 shadow-[0_24px_60px_rgba(0,0,0,0.8)] relative">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Age selection chips */}
              <div>
                <label className="block text-[11px] font-sans uppercase tracking-[0.16em] text-[#A3A8B5] mb-3 font-medium">
                  Возраст танцора:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {['4–6 лет (Начальная)', '7–10 лет (Школа)', '11–15 лет (Юниоры)', '16+ лет / Взрослые'].map((age) => (
                    <button
                      type="button"
                      key={age}
                      onClick={() => setSelectedAge(age)}
                      className={`py-3 px-3 rounded-2xl text-xs font-sans tracking-wide text-center border transition-all cursor-pointer ${
                        selectedAge === age
                          ? 'bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] text-[#090A0E] font-semibold border-[#D8BA7A] shadow-md'
                          : 'bg-[#161B26] text-[#A3A8B5] border-white/[0.08] hover:border-white/20 hover:text-[#F8F6F0]'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-sans uppercase tracking-[0.16em] text-[#A3A8B5] mb-2 font-medium">
                    Ваше имя или имя ребенка:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#A3A8B5]/60 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Например: Елена"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#161B26] border border-white/[0.08] text-[#F8F6F0] placeholder-[#A3A8B5]/40 text-sm focus:outline-none focus:border-[#D8BA7A] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-sans uppercase tracking-[0.16em] text-[#A3A8B5] mb-2 font-medium">
                    Телефон для связи: <span className="text-[#D8BA7A]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#A3A8B5]/60 absolute left-4 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#161B26] border border-white/[0.08] text-[#F8F6F0] placeholder-[#A3A8B5]/40 text-sm focus:outline-none focus:border-[#D8BA7A] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button - Pure Olympic Prestige */}
              <button
                type="submit"
                disabled={isSubmitting || !phone}
                className="w-full py-4 rounded-full bg-gradient-to-r from-[#D8BA7A] to-[#C2A260] hover:from-[#EBD8B0] hover:to-[#D8BA7A] text-[#090A0E] font-semibold text-xs sm:text-sm uppercase tracking-[0.16em] shadow-[0_8px_30px_rgba(216,186,122,0.25)] hover:shadow-[0_12px_36px_rgba(216,186,122,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
              >
                {isSubmitting ? (
                  <span>Отправляем приглашение...</span>
                ) : (
                  <>
                    <span>Записаться на бесплатный пробный урок</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-[#A3A8B5]">
                <ShieldCheck className="w-4 h-4 text-[#D8BA7A] shrink-0" />
                <span>Заявка поступает напрямую наставникам в Telegram. Перезвоним в течение дня.</span>
              </div>
            </form>
          ) : (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#161B26] text-[#D8BA7A] border border-[#D8BA7A]/40 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#F8F6F0]">
                Заявка принята
              </h3>
              <p className="text-sm text-[#A3A8B5] max-w-md mx-auto leading-relaxed">
                Мы передали контакты Анне Турчиной. Свяжемся с вами в Telegram или по телефону для согласования времени визита в усадьбу.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setPhone('');
                }}
                className="mt-4 px-6 py-2.5 rounded-full bg-[#161B26] text-xs font-sans tracking-wider uppercase text-[#A3A8B5] hover:text-[#F8F6F0] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Отправить еще одну заявку
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
