
import { Task, PeriodicTask, Component, SystemModel } from '@/types/system';

/**
 * Parses CSV text containing task definitions
 * Expected format: Task, BCET, WCET, Period, Deadline, Priority
 */
export const parseTasksFromCSV = (csvText: string): PeriodicTask[] => {
  // Split by lines and filter empty lines
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);
  
  // Skip header line if present (check if first line contains "Task" and "WCET")
  const startIndex = lines[0].includes('Task') && lines[0].includes('WCET') ? 1 : 0;
  
  const tasks: PeriodicTask[] = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (line.length === 0) continue;
    
    // Split by tab or multiple spaces
    const parts = line.split(/\t+|\s+/).filter(part => part.trim().length > 0);
    
    // Ensure we have all required fields
    if (parts.length < 5) continue;
    
    const [taskName, bcetStr, wcetStr, periodStr, deadlineStr, priorityStr] = parts;
    
    // Parse numbers, with fallbacks for missing values
    const bcet = bcetStr ? parseInt(bcetStr, 10) : undefined;
    const wcet = parseInt(wcetStr, 10);
    const period = parseInt(periodStr, 10);
    const deadline = parseInt(deadlineStr, 10);
    const priority = priorityStr ? parseInt(priorityStr, 10) : undefined;
    
    // Skip if required fields are not valid numbers
    if (isNaN(wcet) || isNaN(period) || isNaN(deadline)) continue;
    
    tasks.push({
      id: taskName,
      name: taskName,
      type: 'periodic',
      bcet: isNaN(bcet) ? undefined : bcet,
      wcet,
      period,
      deadline,
      priority
    });
  }
  
  return tasks;
};

/**
 * Creates a simple system model from a list of tasks
 */
export const createSystemModelFromTasks = (tasks: PeriodicTask[]): SystemModel => {
  // Create a single core with performance factor 1
  const core = {
    id: 'core1',
    name: 'Core 1',
    performanceFactor: 1
  };
  
  // Create a root component containing all tasks with EDF scheduling
  const rootComponent: Component = {
    id: `core-${core.id}`,
    name: 'Root Component',
    schedulingAlgorithm: 'EDF',
    tasks,
    alpha: 1,  // Full resource availability
    delta: 0   // No delay in resource allocation
  };
  
  return {
    cores: [core],
    rootComponents: [rootComponent]
  };
};
