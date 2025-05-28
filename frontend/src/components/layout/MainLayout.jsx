import React from 'react';
import {
  HomeIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const MainLayout = ({ children }) => {
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col items-center justify-center">
        {/* Page content here */}
        <label htmlFor="my-drawer-2" className="btn btn-primary drawer-button lg:hidden">
          Open drawer
        </label>
        <div className="p-4">
          Main Content Area
          {children}
        </div>
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>
        {/* Apply data-theme="night" to the ul element to make the sidebar use the night theme */}
        {/* Changed bg-base-200 to bg-base-100 for a potentially darker shade within the night theme */}
        {/* Increased overall padding for the menu to p-6 for more breathing room */}
        <ul className="menu p-6 w-80 min-h-full bg-base-100 text-base-content" data-theme="night">
          {/* Sidebar content here */}
          {/* Ensured title has sufficient padding and uses theme's text color */}
          <li className="menu-title px-4 pt-2 pb-3">
            <span className="text-xl font-bold text-base-content">Navigation</span>
          </li>
          {/* Added py-3 to each link's parent li for increased vertical spacing */}
          {/* Added hover effect: hover:bg-base-content/10 */}
          <li className="py-1">
            <a href="#" className="py-3 hover:bg-base-content/10 rounded-lg">
              <HomeIcon className="h-6 w-6 mr-3" />
              Dashboard
            </a>
          </li>
          <li className="py-1">
            <a href="#" className="py-3 hover:bg-base-content/10 rounded-lg">
              <ChartBarSquareIcon className="h-6 w-6 mr-3" />
              Analytics
            </a>
          </li>
          <li className="py-1">
            <a href="#" className="py-3 hover:bg-base-content/10 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6 mr-3" />
              Settings
            </a>
          </li>
          <li className="py-1">
            <a href="#" className="py-3 hover:bg-base-content/10 rounded-lg">
              <UserCircleIcon className="h-6 w-6 mr-3" />
              Profile
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MainLayout;
