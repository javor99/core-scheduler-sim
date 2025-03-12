
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface TimelineEvent {
  id: string;
  taskId: string;
  taskName: string;
  startTime: number;
  endTime: number;
  componentId: string;
  componentName: string;
  type: 'execution' | 'preemption' | 'idle';
}

interface TimelineChartProps {
  events: TimelineEvent[];
  simulationEndTime: number;
}

// Generate colors for different tasks
const TASK_COLORS = [
  '#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', 
  '#3F51B5', '#009688', '#FFC107', '#F44336', '#673AB7'
];

const formatTimelineData = (events: TimelineEvent[], endTime: number) => {
  // Group events by taskId for the chart
  const taskGroups = new Map<string, { name: string, events: TimelineEvent[] }>();
  
  events.forEach(event => {
    if (!taskGroups.has(event.taskId)) {
      taskGroups.set(event.taskId, { 
        name: event.taskName, 
        events: []
      });
    }
    taskGroups.get(event.taskId)?.events.push(event);
  });
  
  // Sort and transform data for the chart
  return Array.from(taskGroups.entries()).map(([taskId, { name, events }], index) => {
    const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);
    
    // Create the data for this task row
    return {
      name,
      taskId,
      colorIndex: index % TASK_COLORS.length,
      events: sortedEvents.map(event => ({
        start: event.startTime,
        end: event.endTime,
        duration: event.endTime - event.startTime,
        type: event.type,
        componentName: event.componentName
      }))
    };
  });
};

const TimelineChart: React.FC<TimelineChartProps> = ({ events, simulationEndTime }) => {
  const timelineData = formatTimelineData(events, simulationEndTime);
  
  if (events.length === 0) {
    return <div className="text-center py-8 text-gray-500">No timeline data available</div>;
  }
  
  return (
    <div className="w-full h-96 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={timelineData}
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            domain={[0, simulationEndTime]}
            label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            label={{ value: 'Tasks', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value: any, name: string) => [
              `Duration: ${value}`, name
            ]}
            labelFormatter={(value) => `Task: ${value}`}
          />
          <Legend />
          
          {timelineData.map((task, taskIndex) => (
            <Bar 
              key={task.taskId} 
              dataKey="duration"
              name={task.name}
              fill={TASK_COLORS[task.colorIndex]}
              stackId="timeline"
            >
              {task.events.map((event, eventIndex) => (
                <Cell 
                  key={`cell-${taskIndex}-${eventIndex}`} 
                  fill={event.type === 'idle' ? '#e0e0e0' : 
                        event.type === 'preemption' ? '#ffcdd2' : 
                        TASK_COLORS[task.colorIndex]} 
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimelineChart;
