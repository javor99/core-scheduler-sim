
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { SimulationResults, TaskExecutionLog } from '@/types/system';

interface SimulationTimelineProps {
  executionLogs: TaskExecutionLog[];
  simulationTime: number;
}

const SimulationTimeline: React.FC<SimulationTimelineProps> = ({ 
  executionLogs, 
  simulationTime 
}) => {
  const [timeWindow, setTimeWindow] = useState({ start: 0, end: Math.min(100, simulationTime) });
  
  // Process execution logs to create timeline data
  const timelineData = [];
  
  // Group logs by task
  const taskGroups = executionLogs.reduce((acc, log) => {
    if (!acc[log.taskId]) {
      acc[log.taskId] = [];
    }
    acc[log.taskId].push(log);
    return acc;
  }, {} as Record<string, TaskExecutionLog[]>);
  
  // For each time unit in our window, create a data point
  for (let t = timeWindow.start; t <= timeWindow.end; t++) {
    const dataPoint: any = { time: t };
    
    // For each task, check if it's running at this time
    Object.entries(taskGroups).forEach(([taskId, logs]) => {
      const isRunning = logs.some(log => 
        log.startTime <= t && t < log.endTime
      );
      
      // Create a value for the task that can be displayed in a stacked bar
      dataPoint[taskId] = isRunning ? 1 : 0;
      
      // Mark task arrivals
      const arrival = logs.find(log => log.arrivalTime === t);
      if (arrival) {
        dataPoint[`${taskId}_arrival`] = true;
      }
      
      // Mark task deadlines
      const deadline = logs.find(log => log.deadline === t);
      if (deadline) {
        dataPoint[`${taskId}_deadline`] = true;
      }
    });
    
    timelineData.push(dataPoint);
  }
  
  // Generate colors for tasks
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', 
    '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
  ];
  
  const handleZoomIn = () => {
    const windowSize = timeWindow.end - timeWindow.start;
    const newWindowSize = Math.max(10, Math.floor(windowSize * 0.5));
    const midPoint = (timeWindow.start + timeWindow.end) / 2;
    setTimeWindow({
      start: Math.max(0, Math.floor(midPoint - newWindowSize / 2)),
      end: Math.min(simulationTime, Math.ceil(midPoint + newWindowSize / 2))
    });
  };
  
  const handleZoomOut = () => {
    const windowSize = timeWindow.end - timeWindow.start;
    const newWindowSize = Math.min(simulationTime, Math.floor(windowSize * 2));
    const midPoint = (timeWindow.start + timeWindow.end) / 2;
    setTimeWindow({
      start: Math.max(0, Math.floor(midPoint - newWindowSize / 2)),
      end: Math.min(simulationTime, Math.ceil(midPoint + newWindowSize / 2))
    });
  };
  
  const handlePanLeft = () => {
    const windowSize = timeWindow.end - timeWindow.start;
    const panAmount = Math.floor(windowSize * 0.25);
    if (timeWindow.start - panAmount >= 0) {
      setTimeWindow({
        start: timeWindow.start - panAmount,
        end: timeWindow.end - panAmount
      });
    } else {
      setTimeWindow({
        start: 0,
        end: windowSize
      });
    }
  };
  
  const handlePanRight = () => {
    const windowSize = timeWindow.end - timeWindow.start;
    const panAmount = Math.floor(windowSize * 0.25);
    if (timeWindow.end + panAmount <= simulationTime) {
      setTimeWindow({
        start: timeWindow.start + panAmount,
        end: timeWindow.end + panAmount
      });
    } else {
      setTimeWindow({
        start: simulationTime - windowSize,
        end: simulationTime
      });
    }
  };
  
  // Get all task IDs
  const taskIds = Object.keys(taskGroups);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Execution Timeline</h3>
        <div className="flex gap-2">
          <button 
            onClick={handlePanLeft}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            disabled={timeWindow.start === 0}
          >
            ←
          </button>
          <button 
            onClick={handleZoomIn}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            -
          </button>
          <button 
            onClick={handlePanRight}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            disabled={timeWindow.end === simulationTime}
          >
            →
          </button>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="mb-2 text-sm text-gray-500">
          Viewing time units {timeWindow.start} to {timeWindow.end} (of {simulationTime})
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              barGap={0}
              barSize={10}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="time" 
                label={{ value: 'Time', position: 'insideBottomRight', offset: -10 }} 
              />
              <YAxis 
                type="category" 
                dataKey="taskId" 
                width={80} 
                tickFormatter={(value) => 'Tasks'} 
                domain={[0, 'auto']} 
              />
              <Tooltip 
                formatter={(value, name) => {
                  // Fix type error by converting name to string first
                  const nameStr = String(name);
                  if (nameStr.endsWith('_arrival') || nameStr.endsWith('_deadline')) return null;
                  return [value === 1 ? 'Running' : 'Idle', nameStr];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend />
              
              {taskIds.map((taskId, index) => (
                <Bar 
                  key={taskId} 
                  dataKey={taskId} 
                  name={taskId}
                  stackId="stack" 
                  fill={colors[index % colors.length]} 
                />
              ))}
              
              {/* Reference lines for task arrivals and deadlines could be added here */}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {taskIds.map((taskId, index) => (
            <div key={taskId} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-sm">{taskId}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimulationTimeline;
