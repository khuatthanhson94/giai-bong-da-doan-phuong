import { useState, useEffect } from 'react';
import GroupSchedule from './GroupSchedule';
import KnockoutBuilder from './KnockoutBuilder';

/**
 * Admin page that consolidates schedule management.
 * Shows two tabs: "Vòng bảng" (group stage) and "Vòng knockout" (knockout stage).
 * The admin can manage group‑stage matches, then configure knockout brackets
 * by selecting teams and round, and finally generate the knockout schedule.
 */
export default function AdminSchedule() {
  const [activeTab, setActiveTab] = useState('group');

  useEffect(() => {
    console.log('✅ AdminSchedule mounted');
  }, []);



  return (
    <div>
      {/* Tab navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`mr-4 pb-2 ${activeTab === 'group' ? 'border-b-2 border-primary text-primary' : 'text-gray-600'}`}
          onClick={() => setActiveTab('group')}
        >
          Vòng bảng
        </button>
        <button
          className={`pb-2 ${activeTab === 'knockout' ? 'border-b-2 border-primary text-primary' : 'text-gray-600'}`}
          onClick={() => setActiveTab('knockout')}
        >
          Vòng knockout
        </button>
      </div>

      {/* Content */}
      {activeTab === 'group' && <GroupSchedule />}
      {activeTab === 'knockout' && <KnockoutBuilder />}
    </div>
  );
}
