'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Bell, 
  Building2, 
  ChevronRight,
  Shield,
  Key,
  Globe,
  Palette
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Workspace',
    description: 'General workspace configuration and preferences',
    href: '/dashboard/settings/workspace',
    icon: Building2,
  },
  {
    title: 'Team Members',
    description: 'Manage team members and their permissions',
    href: '/dashboard/settings/users',
    icon: Users,
  },
  {
    title: 'Notifications',
    description: 'Configure alert notification preferences',
    href: '/dashboard/settings/notifications',
    icon: Bell,
  },
  {
    title: 'API Keys',
    description: 'Manage programmatic access to your workspace',
    href: '/dashboard/settings/api-keys',
    icon: Key,
  },
  {
    title: 'Team',
    description: 'Manage team members and their roles',
    href: '/dashboard/settings/team',
    icon: Users,
  },
];

export default function SettingsPage() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your workspace and team preferences</p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group bg-zinc-900/50 border border-white/5 rounded-xl p-6 hover:bg-zinc-800/50 hover:border-red-900/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-red-900/20 rounded-lg group-hover:bg-red-900/30 transition-colors">
                  <Icon className="w-6 h-6 text-red-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-red-400 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4">{section.title}</h3>
              <p className="text-sm text-zinc-500 mt-1">{section.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Workspace Overview</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-zinc-500">Plan</p>
            <p className="text-lg font-medium text-white">Free Team</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Team Members</p>
            <p className="text-lg font-medium text-white">1 member</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Integrations</p>
            <p className="text-lg font-medium text-white">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
