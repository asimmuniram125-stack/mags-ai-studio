'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeFlow } from '@/components/onboarding/welcome-flow';
import { AccountSetup } from '@/components/onboarding/account-setup';
import { WorkspaceSetup } from '@/components/onboarding/workspace-setup';
import { ProductTour } from '@/components/onboarding/product-tour';
import { ProgressTracker } from '@/components/onboarding/progress-tracker';

export default function OnboardingPage() {
  const router = useRouter();
  const { progress, completeStep, skipStep, loading } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (progress?.completedAt) {
      router.push('/dashboard');
    }
  }, [progress?.completedAt, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Setting up your experience...</p>
        </div>
      </div>
    );
  }

  const steps = [
    <WelcomeFlow key="welcome" onNext={() => handleStepComplete('welcome')} />,
    <AccountSetup key="account" onNext={() => handleStepComplete('account_setup')} />,
    <WorkspaceSetup key="workspace" onNext={() => handleStepComplete('workspace_setup')} />,
    <ProductTour key="tour" onNext={() => handleStepComplete('ai_intro')} />,
  ];

  async function handleStepComplete(stepKey: string) {
    await completeStep(stepKey);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  async function handleSkipStep(stepKey: string) {
    await skipStep(stepKey);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="max-w-4xl mx-auto p-4">
        <ProgressTracker
          currentStep={currentStepIndex}
          totalSteps={steps.length}
          percentage={progress?.percentage || 0}
        />

        <div className="mt-8">
          {steps[currentStepIndex]}

          <div className="flex gap-4 mt-8">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                className="px-6 py-2 text-white border border-white rounded-lg hover:bg-white hover:text-purple-900 transition"
              >
                Back
              </button>
            )}

            <button
              onClick={() => handleSkipStep(`step_${currentStepIndex}`)}
              className="px-6 py-2 text-gray-300 text-sm hover:text-white transition"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
