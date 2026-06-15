'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganizationStore } from '@/stores/organization.store';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export function OrganizationSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const {
    organizations,
    currentOrganization,
    fetchOrganizations,
    selectOrganization,
  } = useOrganizationStore();

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleSelectOrg = async (orgId: string) => {
    await selectOrganization(orgId);
    setIsOpen(false);
    router.push(`/workspace/${orgId}`);
  };

  const handleCreateOrg = () => {
    router.push('/org/create');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 size={18} />
          <span className="truncate max-w-[150px]">
            {currentOrganization?.name || 'Select Organization'}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={clsx('transition-transform', { 'rotate-180': isOpen })}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50"
          >
            <div className="max-h-60 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org.id)}
                  className={clsx(
                    'w-full text-left px-4 py-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-700 transition-colors',
                    currentOrganization?.id === org.id && 'bg-blue-600/20',
                  )}
                >
                  <p className="font-medium text-white">{org.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {org.memberCount} members
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateOrg}
              className="w-full px-4 py-3 text-left text-blue-400 hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-slate-700"
            >
              <Plus size={16} />
              Create Organization
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
