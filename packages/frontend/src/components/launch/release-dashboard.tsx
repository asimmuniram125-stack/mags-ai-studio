'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function ReleaseDashboard({ currentRelease }: { currentRelease: any }) {
  if (!currentRelease) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
        No active release at this time
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-8"
    >
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">{currentRelease.name}</h2>
          <p className="text-gray-600 mb-6">{currentRelease.description}</p>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Release Status</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentRelease.status === 'production'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentRelease.status}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Rollout Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${currentRelease.phasePercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">{currentRelease.phasePercentage}% of users</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Key Features</h3>
          <ul className="space-y-2">
            {currentRelease.features?.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {currentRelease.breakingChanges && currentRelease.breakingChanges.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">⚠️ Breaking Changes</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {currentRelease.breakingChanges.map((change: string, i: number) => (
              <li key={i}>• {change}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
