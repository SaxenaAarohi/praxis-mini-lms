import { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Mini LMS</span>
          <span className="text-slate-400">Built with React, Express, Prisma & OpenRouter</span>
        </div>
      </footer>
    </div>
  );
}
