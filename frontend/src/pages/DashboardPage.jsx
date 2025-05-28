import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';

const DashboardPage = () => {
  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">Dashboard Overview</h1>
        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
          <Card title="Welcome" className="w-full sm:w-1/2 lg:w-1/3">
            <p>Welcome to your new dashboard!</p>
            <p className="mt-2 text-sm text-base-content/70">
              This is a placeholder card. You can customize its content and add more components.
            </p>
          </Card>
          <Card title="Quick Stats" className="w-full sm:w-1/2 lg:w-1/3">
            <p>Some placeholder stats or a message about upcoming chart integration.</p>
            <div className="stats shadow mt-4">
              <div className="stat">
                <div className="stat-title">Downloads</div>
                <div className="stat-value">31K</div>
                <div className="stat-desc">Jan 1st - Feb 1st</div>
              </div>
              <div className="stat">
                <div className="stat-title">New Users</div>
                <div className="stat-value">4,200</div>
                <div className="stat-desc">↗︎ 400 (22%)</div>
              </div>
            </div>
          </Card>
          <Card title="Recent Activity" className="w-full sm:w-1/2 lg:w-1/3">
            <p>Placeholder for recent activity feed.</p>
            <ul className="list-disc list-inside mt-2 text-sm text-base-content/70">
              <li>User John Doe signed up.</li>
              <li>System update v1.2 completed.</li>
              <li>New report generated.</li>
            </ul>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
