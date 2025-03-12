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
 * Calculate Demand Bound Function for EDF scheduler
 */
export const calculateDBFforEDF = (tasks: Task[], t: number): number => {
  return tasks.reduce((totalDemand, task) => {
    if (isPeriodic(task)) {
      // For periodic tasks, calculate floor((t + Ti - Di)/Ti) * Ci
      const numJobs = Math.floor((t + task.period - task.deadline) / task.period);
      return totalDemand + Math.max(0, numJobs * task.wcet);
    } else if (isSporadic(task)) {
      // For sporadic tasks
      const numJobs = Math.floor((t + task.minimumInterArrivalTime - task.deadline) / task.minimumInterArrivalTime);
      return totalDemand + Math.max(0, numJobs * task.wcet);
    }
    return totalDemand;
  }, 0);
};

/**
 * Calculate Demand Bound Function for FPS scheduler
 */
export const calculateDBFforFPS = (tasks: Task[], t: number, taskIndex: number): number => {
  const task = tasks[taskIndex];
  let demand = 0;

  // Calculate interference from higher priority tasks
  tasks.slice(0, taskIndex).forEach(higherPriorityTask => {
    if (isPeriodic(higherPriorityTask)) {
      demand += Math.ceil(t / higherPriorityTask.period) * higherPriorityTask.wcet;
    } else if (isSporadic(higherPriorityTask)) {
      demand += Math.ceil(t / higherPriorityTask.minimumInterArrivalTime) * higherPriorityTask.wcet;
    }
  });

  // Add own execution time
  if (isPeriodic(task)) {
    demand += task.wcet;
  } else if (isSporadic(task)) {
    demand += task.wcet;
  }

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
 */
export const isComponentSchedulable = (component: Component): boolean => {
  const tasks = [...component.tasks];
  
  // Sort tasks by priority for FPS
  if (component.schedulingAlgorithm === 'FPS') {
    tasks.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  // Calculate hyperperiod and critical instant
  const hyperperiod = tasks.reduce((lcm, task) => {
    const period = isPeriodic(task) 
      ? task.period 
      : isSporadic(task) 
        ? task.minimumInterArrivalTime 
        : 1;
    return lcm * period / gcd(lcm, period);
  }, 1);

  // Calculate utilization
  const utilization = tasks.reduce((sum, task) => {
    if (isPeriodic(task)) {
      return sum + (task.wcet / task.period);
    } else if (isSporadic(task)) {
      return sum + (task.wcet / task.minimumInterArrivalTime);
    }
    return sum;
  }, 0);

  // Quick check: if utilization > 1, definitely not schedulable
  if (utilization > 1) {
    return false;
  }

  // Check schedulability over the hyperperiod
  const checkPoints = tasks.reduce((points, task) => {
    const deadline = task.deadline;
    for (let t = deadline; t <= hyperperiod; t += task.period) {
      points.add(t);
    }
    return points;
  }, new Set<number>());

  // Check demand bound function at each scheduling point
  for (const t of Array.from(checkPoints)) {
    if (component.schedulingAlgorithm === 'EDF') {
      const demand = calculateDBFforEDF(tasks, t);
      const supply = t * (component.alpha || 1);
      if (demand > supply) {
        return false;
      }
    } else if (component.schedulingAlgorithm === 'FPS') {
      for (let i = 0; i < tasks.length; i++) {
        const demand = calculateDBFforFPS(tasks, t, i);
        const supply = t * (component.alpha || 1);
        if (demand > supply) {
          return false;
        }
      }
    }
  }

  return true;
};

// Helper function for calculating GCD
const gcd = (a: number, b: number): number => {
  while (b > 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
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
