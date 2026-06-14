'use client';

export function DeploymentForm({ projectId }: { projectId: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-white">New Deployment</h3>
      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
        Create Deployment
      </button>
    </div>
  );
}