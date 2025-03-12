
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
      // For periodic tasks with deadline <= period (constrained)
      const numJobs = Math.max(0, Math.floor((t - task.deadline) / task.period) + 1);
      return totalDemand + numJobs * task.wcet;
    } else if (isSporadic(task)) {
      // For sporadic tasks with deadline <= minimumInterArrivalTime (constrained)
      const numJobs = Math.max(0, Math.floor((t - task.deadline) / task.minimumInterArrivalTime) + 1);
      return totalDemand + numJobs * task.wcet;
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

  // For EDF, calculate hyperperiod from task periods
  let hyperperiod = 1;
  for (const task of tasks) {
    const taskPeriod = isPeriodic(task) ? task.period : isSporadic(task) ? task.minimumInterArrivalTime : 1;
    hyperperiod = lcm(hyperperiod, taskPeriod);
  }
  
  // For practical reasons, limit the hyperperiod to a reasonable value
  const maxCheckTime = Math.min(hyperperiod, 1000);
  
  // Generate checkpoints at task deadlines
  const checkPoints = new Set<number>();
  for (const task of tasks) {
    let deadline = task.deadline;
    while (deadline <= maxCheckTime) {
      checkPoints.add(deadline);
      if (isPeriodic(task)) {
        deadline += task.period;
      } else if (isSporadic(task)) {
        deadline += task.minimumInterArrivalTime;
      } else {
        break;
      }
    }
  }

  // Check demand bound function at each scheduling point
  for (const t of Array.from(checkPoints).sort((a, b) => a - b)) {
    if (component.schedulingAlgorithm === 'EDF') {
      const demand = calculateDBFforEDF(tasks, t);
      const supply = calculateSBFforBDR(component.alpha || 1, component.delta || 0, t);
      
      if (demand > supply) {
        return false;
      }
    } else if (component.schedulingAlgorithm === 'FPS') {
      for (let i = 0; i < tasks.length; i++) {
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

// Helper function for calculating GCD
const gcd = (a: number, b: number): number => {
  while (b > 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
};

// Helper function for calculating LCM
const lcm = (a: number, b: number): number => {
  return (a * b) / gcd(a, b);
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
