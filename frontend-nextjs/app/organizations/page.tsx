'use client';

import { Building2 } from 'lucide-react';

export default function OrganizationsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-6 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-600">Manage organizations</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <Building2 className="h-16 w-16 mx-auto text-gray-400" />
            <p className="text-gray-600">Organizations</p>
            <p className="text-sm text-gray-500">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
