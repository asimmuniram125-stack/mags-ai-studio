'use client';

import { motion } from 'framer-motion';

export function WelcomeFlow({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 text-white text-center"
    >
      <div className="space-y-4">
        <h1 className="text-5xl font-bold">Welcome to MAGS AI Studio</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          The complete enterprise AI platform for building, deploying, and managing AI applications at scale.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 my-12">
        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur">
          <div className="text-3xl mb-3">🤖</div>
          <h3 className="font-semibold mb-2">AI Chat</h3>
          <p className="text-sm text-gray-300">Intelligent conversations powered by advanced AI models</p>
        </div>

        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur">
          <div className="text-3xl mb-3">🏗️</div>
          <h3 className="font-semibold mb-2">App Builder</h3>
          <p className="text-sm text-gray-300">Generate full-stack applications from descriptions</p>
        </div>

        <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold mb-2">Analytics</h3>
          <p className="text-sm text-gray-300">Deep insights into your AI application performance</p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition transform hover:scale-105"
      >
        Let's Get Started →
      </button>
    </motion.div>
  );
}
