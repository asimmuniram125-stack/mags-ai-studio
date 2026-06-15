'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfrastructureStore } from '@/stores/infrastructure.store';
import { Region } from '@/types/infrastructure';
import { Rocket, GitBranch, Radio } from 'lucide-react';
import clsx from 'clsx';

interface DeploymentPanelProps {
  appId: string;
}

export function DeploymentPanel({ appId }: DeploymentPanelProps) {
  const { deployGlobally, deployCanary, isLoading } = useInfrastructureStore();
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [deploymentType, setDeploymentType] = useState<'full' | 'canary'>('full');
  const [canaryPercentage, setCanaryPercentage] = useState(10);

  const regions: Region[] = [
    Region.US_EAST,
    Region.US_WEST,
    Region.EU_WEST,
    Region.EU_CENTRAL,
    Region.ASIA_SOUTHEAST,
    Region.ASIA_NORTHEAST,
  ];

  const toggleRegion = (region: Region) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region],
    );
  };

  const handleDeploy = async () => {
    if (selectedRegions.length === 0) return;

    if (deploymentType === 'canary') {
      // First deploy full, then start canary
      await deployGlobally(appId, [selectedRegions[0]]);
    } else {
      await deployGlobally(appId, selectedRegions);
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 backdrop-blur">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Rocket size={20} />
        Global Deployment
      </h3>

      {/* Deployment Type Selection */}
      <div className="mb-6 space-y-3">
        <label className="text-sm font-medium text-gray-300">Deployment Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeploymentType('full')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-all',
              deploymentType === 'full'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600',
            )}
          >
            <GitBranch className="inline mr-2" size={16} />
            Full Deployment
          </button>
          <button
            onClick={() => setDeploymentType('canary')}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium transition-all',
              deploymentType === 'canary'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600',
            )}
          >
            <Radio className="inline mr-2" size={16} />
            Canary
          </button>
        </div>
      </div>

      {/* Canary Percentage */}
      <AnimatePresence>
        {deploymentType === 'canary' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 pb-6 border-b border-slate-600"
          >
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Initial Canary: {canaryPercentage}%
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={canaryPercentage}
              onChange={(e) => setCanaryPercentage(Number(e.target.value))}
              className="w-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Region Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-300 block mb-3">
          Select Regions ({selectedRegions.length}/{regions.length})
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              className={clsx(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                selectedRegions.includes(region)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600',
              )}
            >
              {region.split('-')[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Deploy Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDeploy}
        disabled={isLoading || selectedRegions.length === 0}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
      >
        <Rocket size={18} />
        {isLoading ? 'Deploying...' : `Deploy to ${selectedRegions.length} Region${selectedRegions.length !== 1 ? 's' : ''}`}
      </motion.button>
    </div>
  );
}
