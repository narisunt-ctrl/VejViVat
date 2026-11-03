import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { HerbAdventure } from '../../games/herb-adventure';

// เกมผจญภัย ยายพร้อมตะลุยเก็บสมุนไพร: a side-scrolling herb-collecting game; progress is kept in this browser.

export const AdventurePage: React.FC = () => (
  <div className="space-y-3">
    <Link to="/yai/discover" className="inline-flex min-h-[44px] items-center gap-1 text-lx-muted">
      <ChevronLeft className="h-5 w-5" aria-hidden="true" /> สมุนไพรไทย
    </Link>
    <HerbAdventure />
    <p className="text-xs text-lx-muted">เกมเพื่อความสนุกและรู้จักชื่อสมุนไพรไทย ไม่ได้ให้รางวัลกับการกินสมุนไพรเป็นยา · ความคืบหน้าเก็บในเครื่องนี้</p>
  </div>
);
