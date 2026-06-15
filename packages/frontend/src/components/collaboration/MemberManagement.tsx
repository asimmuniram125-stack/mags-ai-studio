'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganizationStore } from '@/stores/organization.store';
import { Membership, OrganizationRole } from '@/types/collaboration';
import { Users, Plus, Trash2, Shield } from 'lucide-react';
import clsx from 'clsx';

export function MemberManagement() {
  const {
    currentOrganization,
    members,
    fetchMembers,
    inviteUser,
    updateMemberRole,
    removeMember,
    isLoading,
  } = useOrganizationStore();

  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.MEMBER);

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers(currentOrganization.id);
    }
  }, [currentOrganization, fetchMembers]);

  const handleInvite = async () => {
    if (!email) return;
    await inviteUser(email, role);
    setEmail('');
    setRole(OrganizationRole.MEMBER);
    setIsInviting(false);
  };

  const roleColors: Record<OrganizationRole, string> = {
    [OrganizationRole.OWNER]: 'bg-red-500/20 text-red-300 border-red-500/50',
    [OrganizationRole.ADMIN]: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    [OrganizationRole.MEMBER]: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    [OrganizationRole.VIEWER]: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    [OrganizationRole.BILLING_ADMIN]: 'bg-green-500/20 text-green-300 border-green-500/50',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users size={20} />
          Members
        </h3>
        <button
          onClick={() => setIsInviting(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          <Plus size={16} />
          Invite
        </button>
      </div>

      <AnimatePresence>
        {isInviting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-slate-700/30 border border-slate-600 rounded-lg"
          >
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OrganizationRole)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                {Object.values(OrganizationRole).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleInvite}
                  disabled={isLoading || !email}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium transition-colors"
                >
                  Send Invite
                </button>
                <button
                  onClick={() => setIsInviting(false)}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-gray-400 text-sm">No members yet</p>
        ) : (
          members.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{member.user.email}</p>
                <p className="text-xs text-gray-400 mt-1">{member.user.name}</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateMemberRole(member.id, e.target.value as OrganizationRole)
                  }
                  className={clsx(
                    'px-3 py-1 rounded text-sm font-medium border transition-colors',
                    roleColors[member.role as OrganizationRole],
                  )}
                >
                  {Object.values(OrganizationRole).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeMember(member.id)}
                  className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  title="Remove member"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
