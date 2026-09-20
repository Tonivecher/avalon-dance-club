import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PhotoBento } from './components/PhotoBento';
import { UsadbaGallery } from './components/UsadbaGallery';
import { LiveSchedule } from './components/LiveSchedule';
import { CoachesSection } from './components/CoachesSection';
import { QuickLeadForm } from './components/QuickLeadForm';
import { Footer } from './components/Footer';
import { useClubContent } from './data/useClubContent';

export const App: React.FC = () => {
  const { content } = useClubContent();

  const scrollToBooking = () => {
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090A0E] text-[#F8F6F0] selection:bg-[#D8BA7A]/30 selection:text-[#F8F6F0]">
      {/* Header */}
      <Header onOpenQuiz={scrollToBooking} />

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero: Cinematic Manor Ballroom & Olympic Spirit */}
        <Hero
          onOpenForm={scrollToBooking}
          announcements={content.announcements}
          hallStatus={content.hallStatus}
        />

        {/* 2. Bento Grid: Real Photos & Champion Kids from @dusha_avalon */}
        <PhotoBento gallery={content.gallery} />

        {/* 3. Usadba Sviblovo Ballroom & Park Gallery */}
        <UsadbaGallery onOpenForm={scrollToBooking} />

        {/* 4. Swiss Timetable Grid */}
        <LiveSchedule
          onOpenQuiz={scrollToBooking}
          schedule={content.schedule}
        />

        {/* 5. Professional Coaches Staff */}
        <CoachesSection
          onOpenForm={scrollToBooking}
          coaches={content.coaches}
        />

        {/* 6. Quick 1-Step Lead Form for Free Trial Lesson */}
        <QuickLeadForm />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
