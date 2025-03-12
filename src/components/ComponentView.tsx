
import React from 'react';
import { Component } from '@/types/system';
import TaskList from './TaskList';

interface ComponentViewProps {
  component: Component;
  level?: number;
}

const ComponentView: React.FC<ComponentViewProps> = ({ component, level = 0 }) => {
  return (
    <div className={`border rounded p-3 mb-3 ${level === 0 ? 'bg-blue-50' : 'bg-green-50'}`}>
      <h3 className="text-lg font-medium mb-2">
        {component.name} ({component.schedulingAlgorithm})
      </h3>
      
      {component.alpha !== undefined && component.delta !== undefined && (
        <div className="flex gap-4 mb-3 text-sm">
          <div className="bg-white px-2 py-1 rounded border">
            α = {component.alpha.toFixed(3)}
          </div>
          <div className="bg-white px-2 py-1 rounded border">
            Δ = {component.delta.toFixed(2)}
          </div>
        </div>
      )}
      
      <TaskList tasks={component.tasks} title="Tasks" />
      
      {component.childComponents && component.childComponents.length > 0 && (
        <div className="ml-4">
          <h4 className="text-md font-medium mb-2">Child Components</h4>
          {component.childComponents.map((child) => (
            <ComponentView key={child.id} component={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ComponentView;
