import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button'; // Import Button
import Input from '../components/ui/Input';   // Import Input
import {
  BriefcaseIcon,
  BellAlertIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'; // Import necessary Heroicons

const DashboardPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [anotherInputValue, setAnotherInputValue] = useState('');

  return (
    <MainLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">Dashboard Overview</h1>
        {/* Changed to a grid layout for better structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card title="Welcome" className="xl:col-span-1">
            <p className="text-base-content/80">Welcome back, User! We're glad to see you. Let's make today productive.</p>
            <div className="card-actions justify-end mt-4">
              <Button variant="primary">Get Started</Button>
            </div>
          </Card>

          <Card title="Quick Stats" className="xl:col-span-1">
            {/* Responsive stats: vertical on small, horizontal on large screens */}
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-200/30">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <BriefcaseIcon className="inline-block w-8 h-8 stroke-current" />
                </div>
                <div className="stat-title">Active Projects</div>
                <div className="stat-value text-primary">12</div>
                <div className="stat-desc">+2 this month</div>
              </div>
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <BellAlertIcon className="inline-block w-8 h-8 stroke-current" />
                </div>
                <div className="stat-title">Tasks Due</div>
                <div className="stat-value text-secondary">5</div>
                <div className="stat-desc">2 overdue</div>
              </div>
              <div className="stat">
                 <div className="stat-figure text-accent">
                  <UsersIcon className="inline-block w-8 h-8 stroke-current" />
                </div>
                <div className="stat-title">Team Online</div>
                <div className="stat-value text-accent">3</div>
                <div className="stat-desc">John, Jane, Alex</div>
              </div>
            </div>
          </Card>

          <Card title="Recent Activity" className="xl:col-span-1">
            <ul className="space-y-2 text-sm text-base-content/80">
              <li className="flex items-start"><span className="text-primary mr-2 mt-1">&#9679;</span>Project 'Vision UI' kickoff meeting scheduled for tomorrow.</li>
              <li className="flex items-start"><span className="text-secondary mr-2 mt-1">&#9679;</span>New task 'Wireframe Design' assigned to you.</li>
              <li className="flex items-start"><span className="text-accent mr-2 mt-1">&#9679;</span>AI model 'Orion-3' completed training cycle with 98.7% accuracy.</li>
            </ul>
          </Card>

          {/* Component Demonstration Card spans full width on medium and larger screens */}
          <Card title="Component Demonstration" className="md:col-span-2 xl:col-span-3">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Buttons</h3> {/* Increased mb slightly */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="accent">Accent</Button>
                  <Button variant="neutral">Neutral</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <Button variant="primary" size="lg">Large Primary</Button>
                  <Button variant="secondary" size="md">Medium Secondary</Button>
                  <Button variant="accent" size="sm">Small Accent</Button>
                  <Button variant="info" size="xs">Tiny Info</Button>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <Button variant="success" outline>Outline Success</Button>
                  <Button variant="warning" outline>Outline Warning</Button>
                  <Button variant="error" fullWidth>Full Width Error</Button>
                </div>
                 <div className="flex flex-wrap gap-2 items-center mt-2">
                  <Button variant="primary" disabled>Disabled Primary</Button>
                  <Button variant="secondary" outline disabled>Disabled Outline Secondary</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 mt-4">Inputs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    placeholder="Default (bordered) input..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <Input
                    variant="ghost"
                    type="text"
                    placeholder="Ghost input..."
                    value={anotherInputValue}
                    onChange={(e) => setAnotherInputValue(e.target.value)}
                  />
                  <Input
                    size="lg"
                    type="email"
                    placeholder="Large input for email..."
                  />
                  <Input
                    size="sm"
                    type="password"
                    placeholder="Small input for password..."
                  />
                   <Input
                    type="text"
                    placeholder="Disabled input"
                    disabled
                  />
                  <Input
                    variant="bordered"
                    type="text"
                    className="input-error" // Example of adding DaisyUI specific state class
                    placeholder="Input with error state..."
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
