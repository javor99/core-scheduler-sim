
import React from 'react';
import { Core } from '@/types/system';

interface CoreVisualizerProps {
  core: Core;
  children?: React.ReactNode;
}

const CoreVisualizer: React.FC<CoreVisualizerProps> = ({ core, children }) => {
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          Core {core.name} (Performance: {core.performanceFactor.toFixed(2)})
        </h3>
        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          ID: {core.id}
        </div>
      </div>
      <div className="bg-gray-50 rounded-md p-3">
        {children}
      </div>
    </div>
  );
};

export default CoreVisualizer;
