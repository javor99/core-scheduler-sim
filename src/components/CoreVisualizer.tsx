
import React, { useState } from 'react';
import { Core } from '@/types/system';
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface CoreVisualizerProps {
  core: Core;
  children?: React.ReactNode;
}

const CoreVisualizer: React.FC<CoreVisualizerProps> = ({ core, children }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div 
        className="flex justify-between items-center mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Cpu className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium">
            Core {core.name} 
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            ID: {core.id}
          </div>
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
            Performance: {core.performanceFactor.toFixed(2)}x
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50 rounded-md p-3 transition-all">
          <div className="text-sm text-gray-600 mb-3">
            <p>Performance Factor: {core.performanceFactor.toFixed(2)}x</p>
            <p>Execution time is {core.performanceFactor < 1 ? 'slower' : 'faster'} than reference</p>
            {core.performanceFactor < 1 && (
              <p className="text-amber-600">
                Tasks will take {(1/core.performanceFactor).toFixed(2)}x longer to execute
              </p>
            )}
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

export default CoreVisualizer;
