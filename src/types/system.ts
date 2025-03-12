
/**
 * Core system types for the ADAS hierarchical scheduling simulator and analyzer
 */

// Hardware model
export interface Core {
  id: string;
  name: string;
  performanceFactor: number; // Affects execution time (e.g., 0.5 means 50% slower)
}

// Task models
export interface Task {
  id: string;
  name: string;
  wcet: number; // Worst-case execution time (on a reference core with performanceFactor=1)
  deadline: number;
  priority?: number; // Used for FPS scheduling
}

export interface PeriodicTask extends Task {
  type: 'periodic';
  period: number;
}

export interface SporadicTask extends Task {
  type: 'sporadic';
  minimumInterArrivalTime: number; // Minimum time between task arrivals
}

// Component and scheduling
export type SchedulingAlgorithm = 'EDF' | 'FPS';

export interface Component {
  id: string;
  name: string;
  schedulingAlgorithm: SchedulingAlgorithm;
  tasks: (PeriodicTask | SporadicTask)[];
  childComponents?: Component[];
  // BDR parameters
  alpha?: number; // Resource availability factor (0-1)
  delta?: number; // Maximum delay in resource allocation
}

// System model
export interface SystemModel {
  cores: Core[];
  rootComponents: Component[]; // Top-level components, one per core
}

// Simulation result types
export interface TaskResponseTime {
  taskId: string;
  averageResponseTime: number;
  maximumResponseTime: number;
  missedDeadlines: number;
}

export interface ComponentUtilization {
  componentId: string;
  utilization: number; // Actual resource utilization
  allocatedUtilization: number; // Allocated resource (alpha)
}

export interface SimulationResults {
  taskResponseTimes: TaskResponseTime[];
  componentUtilizations: ComponentUtilization[];
  simulationTime: number; // Total simulation time
  timestamp: string; // When the simulation was run
}

// Analysis result types
export interface AnalysisResults {
  isSchedulable: boolean;
  componentInterfaces: {
    componentId: string;
    alpha: number; // Calculated alpha
    delta: number; // Calculated delta
    supplyBudget?: number; // If using Half-Half algorithm
    supplyPeriod?: number; // If using Half-Half algorithm
  }[];
  timestamp: string; // When the analysis was run
}
