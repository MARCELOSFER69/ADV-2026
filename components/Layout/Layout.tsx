
import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import ToastContainer from '../ui/Toast';
import { AssistantSidebar } from '../ai/AssistantSidebar';
import CommandPalette from '../ui/CommandPalette';

const Layout = ({ children }: { children?: ReactNode }) => {
  return (
    <div className="flex h-full bg-navy-950 font-sans text-slate-200">
      <ToastContainer />
      <AssistantSidebar />
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative mb-16 md:mb-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Layout;
