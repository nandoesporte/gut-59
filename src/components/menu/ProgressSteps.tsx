
interface ProgressStepsProps {
  currentStep: number;
}

export const ProgressSteps = ({ currentStep }: ProgressStepsProps) => {
  return (
    <div className="flex justify-center mb-8">
      <ol className="flex items-center w-full space-x-2 sm:space-x-4">
        {[1, 2, 3, 4].map((step) => (
          <li key={step} className="flex items-center">
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                currentStep === step
                  ? 'bg-primary text-white'
                  : currentStep > step
                  ? 'bg-primary-200 text-primary-700'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step}
            </span>
            {step < 4 && (
              <div
                className={`h-px w-12 sm:w-24 ${
                  currentStep > step ? 'bg-primary-200' : 'bg-gray-200'
                }`}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
