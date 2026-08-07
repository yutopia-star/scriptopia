interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isComplete = idx < currentStep;
          const isActive = idx === currentStep;
          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-7 w-7 items-center justify-center border font-mono text-2xs font-semibold transition-all duration-300 ${
                    isComplete
                      ? 'border-accent bg-accent text-accent-foreground'
                      : isActive
                        ? 'border-foreground text-foreground'
                        : 'border-border bg-surface text-muted-foreground'
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`whitespace-nowrap font-mono text-2xs uppercase tracking-wider ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="mx-2 mb-5 h-px flex-1 bg-border">
                  <div
                    className={`h-full bg-accent transition-all duration-500 ${isComplete ? 'w-full' : 'w-0'}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
