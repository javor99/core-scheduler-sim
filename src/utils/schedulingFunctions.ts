
/**
 * Core scheduling functions for demand bound and supply bound calculations
 */
import { Component, PeriodicTask, SporadicTask, Task } from "@/types/system";

// Helper to check if a task is periodic
const isPeriodic = (task: Task): task is PeriodicTask => {
  return (task as PeriodicTask).period !== undefined;
};

// Helper to check if a task is sporadic
const isSporadic = (task: Task): task is SporadicTask => {
  return (task as SporadicTask).minimumInterArrivalTime !== undefined;
};

/**
 * Calculate Demand Bound Function for EDF scheduler (Equation 2/3 in the project description)
 * @param tasks List of tasks in the component
 * @param t Time interval
 * @returns Total demand in the interval t
 */
export const calculateDBFforEDF = (tasks: Task[], t: number): number => {
  return tasks.reduce((totalDemand, task) => {
    if (isPeriodic(task)) {
      // For periodic tasks with implicit deadlines
      const numJobsInInterval = Math.max(0, Math.floor((t - task.deadline) / task.period) + 1);
      return totalDemand + numJobsInInterval * task.wcet;
    } else if (isSporadic(task)) {
      // For sporadic tasks
      const numJobsInInterval = Math.max(0, Math.floor((t - task.deadline) / task.minimumInterArrivalTime) + 1);
      return totalDemand + numJobsInInterval * task.wcet;
    }
    return totalDemand;
  }, 0);
};

/**
 * Calculate Demand Bound Function for FPS scheduler for a specific task (Equation 4)
 * @param tasks All tasks in the component
 * @param t Time interval
 * @param taskIndex Index of the task to calculate DBF for
 * @returns Total demand in the interval t for the specified task
 */
export const calculateDBFforFPS = (tasks: Task[], t: number, taskIndex: number): number => {
  const task = tasks[taskIndex];
  
  // First calculate the demand of the task itself
  let demand = 0;
  if (isPeriodic(task)) {
    demand = Math.ceil(t / task.period) * task.wcet;
  } else if (isSporadic(task)) {
    demand = Math.ceil(t / task.minimumInterArrivalTime) * task.wcet;
  }
  
  // Add demand from higher priority tasks
  tasks.forEach((higherPriorityTask, index) => {
    if (index < taskIndex) { // Assuming tasks are sorted by priority (higher index = lower priority)
      if (isPeriodic(higherPriorityTask)) {
        demand += Math.ceil(t / higherPriorityTask.period) * higherPriorityTask.wcet;
      } else if (isSporadic(higherPriorityTask)) {
        demand += Math.ceil(t / higherPriorityTask.minimumInterArrivalTime) * higherPriorityTask.wcet;
      }
    }
  });
  
  return demand;
};

/**
 * Calculate Supply Bound Function for BDR (Equation 6)
 * @param alpha Resource availability factor
 * @param delta Maximum delay
 * @param t Time interval
 * @returns Minimum guaranteed supply in interval t
 */
export const calculateSBFforBDR = (alpha: number, delta: number, t: number): number => {
  if (t <= delta) {
    return 0;
  }
  return alpha * (t - delta);
};

/**
 * Check if a component is schedulable
 * @param component The component to check
 * @returns True if schedulable, false otherwise
 */
export const isComponentSchedulable = (component: Component): boolean => {
  // Sort tasks by priority if using FPS
  const tasks = [...component.tasks];
  if (component.schedulingAlgorithm === 'FPS') {
    tasks.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  
  // Calculate maximum time bound to check
  const maxDeadline = Math.max(...tasks.map(task => task.deadline));
  const maxPeriod = Math.max(...tasks.map(task => 
    isPeriodic(task) ? task.period : isSporadic(task) ? task.minimumInterArrivalTime : 0
  ));
  const maxBound = 2 * (maxDeadline + maxPeriod); // A reasonable upper bound
  
  const timePoints = []; // Time points to check
  const step = Math.max(1, Math.floor(maxBound / 100)); // Step size for checking
  
  for (let t = 0; t <= maxBound; t += step) {
    timePoints.push(t);
  }
  
  if (component.schedulingAlgorithm === 'EDF') {
    // For EDF, check DBF ≤ SBF at all relevant time points
    for (const t of timePoints) {
      const demand = calculateDBFforEDF(tasks, t);
      const supply = calculateSBFforBDR(component.alpha || 1, component.delta || 0, t);
      if (demand > supply) {
        return false;
      }
    }
  } else if (component.schedulingAlgorithm === 'FPS') {
    // For FPS, check each task individually
    for (let i = 0; i < tasks.length; i++) {
      for (const t of timePoints) {
        const demand = calculateDBFforFPS(tasks, t, i);
        const supply = calculateSBFforBDR(component.alpha || 1, component.delta || 0, t);
        if (demand > supply) {
          return false;
        }
      }
    }
  }
  
  return true;
};

/**
 * Apply Half-Half algorithm to calculate supply task parameters (Theorem 3)
 * @param alpha Resource availability factor
 * @param delta Maximum delay
 * @returns Object with calculated budget and period
 */
export const applyHalfHalfAlgorithm = (alpha: number, delta: number) => {
  // Per Theorem 3 in the project description
  const supplyPeriod = 2 * delta;
  const supplyBudget = alpha * supplyPeriod;
  
  return {
    supplyBudget,
    supplyPeriod
  };
};

/**
 * Calculate BDR interface parameters for a component
 * @param component The component to calculate parameters for
 * @returns Object with alpha and delta values
 */
export const calculateBDRInterface = (component: Component): { alpha: number, delta: number } => {
  // Start with an initial guess
  let alpha = 0;
  const tasks = component.tasks;
  
  // Calculate initial alpha as total utilization
  tasks.forEach(task => {
    if (isPeriodic(task)) {
      alpha += task.wcet / task.period;
    } else if (isSporadic(task)) {
      alpha += task.wcet / task.minimumInterArrivalTime;
    }
  });
  
  // Add a small margin to ensure schedulability
  alpha = Math.min(alpha * 1.1, 1.0);
  
  // Binary search to find minimum delta where the component is schedulable
  let minDelta = 0;
  let maxDelta = Math.max(...tasks.map(task => task.deadline)) * 2;
  let delta = (minDelta + maxDelta) / 2;
  const precision = 0.1;
  
  while (maxDelta - minDelta > precision) {
    component.alpha = alpha;
    component.delta = delta;
    
    if (isComponentSchedulable(component)) {
      maxDelta = delta;
    } else {
      minDelta = delta;
    }
    
    delta = (minDelta + maxDelta) / 2;
  }
  
  return { alpha, delta: maxDelta }; // Return the safer value
};
