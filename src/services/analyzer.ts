
/**
 * Analyzer implementation for hierarchical scheduling system
 */
import { 
  SystemModel, 
  Component, 
  AnalysisResults 
} from "@/types/system";
import { 
  calculateDBFforEDF, 
  calculateDBFforFPS, 
  calculateSBFforBDR,
  applyHalfHalfAlgorithm
} from "@/utils/schedulingFunctions";

/**
 * Perform schedulability analysis on the system model
 */
export const analyzeSystem = (systemModel: SystemModel): AnalysisResults => {
  const componentInterfaces: AnalysisResults['componentInterfaces'] = [];
  let isSystemSchedulable = true;
  
  // Process each core separately
  for (const core of systemModel.cores) {
    // Get root component for this core
    const rootComponents = systemModel.rootComponents.filter(c => 
      c.id.startsWith(`core-${core.id}`)
    );
    
    for (const rootComponent of rootComponents) {
      // For the root component, alpha is 1 and delta is 0
      rootComponent.alpha = 1;
      rootComponent.delta = 0;
      
      // Calculate interfaces for child components
      const result = analyzeComponent(rootComponent, core.performanceFactor);
      if (!result.isSchedulable) {
        isSystemSchedulable = false;
      }
      
      // Add all interfaces to results
      componentInterfaces.push(...result.interfaces);
    }
  }
  
  return {
    isSchedulable: isSystemSchedulable,
    componentInterfaces,
    timestamp: new Date().toISOString()
  };
};

/**
 * Recursively analyze a component and its children to determine their resource interfaces
 */
const analyzeComponent = (
  component: Component, 
  corePerformanceFactor: number
): { isSchedulable: boolean, interfaces: AnalysisResults['componentInterfaces'] } => {
  const interfaces: AnalysisResults['componentInterfaces'] = [];
  let isComponentSchedulable = true;
  
  // First, recursively analyze child components
  if (component.childComponents && component.childComponents.length > 0) {
    for (const childComponent of component.childComponents) {
      // Calculate minimum interface parameters for child component
      const { alpha, delta } = calculateMinimumInterface(
        childComponent, 
        corePerformanceFactor
      );
      
      // Store the interface
      childComponent.alpha = alpha;
      childComponent.delta = delta;
      
      // Calculate supply parameters using Half-Half algorithm
      const { supplyBudget, supplyPeriod } = applyHalfHalfAlgorithm(alpha, delta);
      
      interfaces.push({
        componentId: childComponent.id,
        alpha,
        delta,
        supplyBudget,
        supplyPeriod
      });
      
      // If alpha > 1, the component is not schedulable with any interface
      if (alpha > 1) {
        isComponentSchedulable = false;
      }
      
      // Analyze child's children recursively
      const childResult = analyzeComponent(childComponent, corePerformanceFactor);
      interfaces.push(...childResult.interfaces);
      if (!childResult.isSchedulable) {
        isComponentSchedulable = false;
      }
    }
  }
  
  // For the component itself, check if it's schedulable with its current interface
  if (!isSchedulableWithInterface(component, corePerformanceFactor)) {
    isComponentSchedulable = false;
  }
  
  // For the root component, also add its interface
  if (component.alpha !== undefined && component.delta !== undefined) {
    interfaces.push({
      componentId: component.id,
      alpha: component.alpha,
      delta: component.delta,
      // Root components don't need supply parameters
    });
  }
  
  return {
    isSchedulable: isComponentSchedulable,
    interfaces
  };
};

/**
 * Calculate the minimum interface (alpha, delta) for a component to be schedulable
 */
const calculateMinimumInterface = (
  component: Component, 
  corePerformanceFactor: number
): { alpha: number, delta: number } => {
  // Start with an initial guess for alpha (based on utilization)
  let alpha = component.tasks.reduce((sum, task) => {
    if ('period' in task) {
      // Account for core performance
      return sum + (task.wcet / corePerformanceFactor) / task.period;
    } else if ('minimumInterArrivalTime' in task) {
      // Account for core performance
      return sum + (task.wcet / corePerformanceFactor) / task.minimumInterArrivalTime;
    }
    return sum;
  }, 0);
  
  // Add a small margin
  alpha = Math.min(alpha * 1.1, 1.0);
  
  // Binary search to find minimum delta
  let minDelta = 0;
  let maxDelta = component.tasks.reduce((max, task) => 
    Math.max(max, task.deadline), 0) * 2;
  
  const precision = 0.1;
  while (maxDelta - minDelta > precision) {
    const midDelta = (minDelta + maxDelta) / 2;
    
    // Test if schedulable with this interface
    if (isSchedulableWithInterface(
      { ...component, alpha, delta: midDelta }, 
      corePerformanceFactor
    )) {
      maxDelta = midDelta;
    } else {
      minDelta = midDelta;
    }
  }
  
  // If no delta makes it schedulable with current alpha, increase alpha
  if (minDelta === maxDelta && !isSchedulableWithInterface(
    { ...component, alpha, delta: maxDelta }, 
    corePerformanceFactor
  )) {
    // Simple approach: increase alpha linearly
    alpha = Math.min(alpha * 1.2, 1.0);
    
    // Try again with increased alpha
    return calculateMinimumInterface(
      { ...component, alpha }, 
      corePerformanceFactor
    );
  }
  
  return { alpha, delta: maxDelta };
};

/**
 * Check if a component is schedulable with its current interface
 */
const isSchedulableWithInterface = (
  component: Component, 
  corePerformanceFactor: number
): boolean => {
  if (component.alpha === undefined || component.delta === undefined) {
    return false;
  }
  
  // Create a time bound for checking
  const maxDeadline = Math.max(...component.tasks.map(t => t.deadline));
  const maxPeriod = Math.max(...component.tasks.map(t => {
    if ('period' in t) return t.period;
    if ('minimumInterArrivalTime' in t) return t.minimumInterArrivalTime;
    return 0;
  }));
  
  const bound = 2 * (maxDeadline + maxPeriod);
  const step = Math.max(1, Math.floor(bound / 100)); // Check 100 points
  
  // Adjust WCET based on core performance
  const adjustedTasks = component.tasks.map(task => ({
    ...task,
    wcet: task.wcet / corePerformanceFactor
  }));
  
  if (component.schedulingAlgorithm === 'EDF') {
    // For EDF, check demand bound function against supply bound function
    for (let t = 0; t <= bound; t += step) {
      const demand = calculateDBFforEDF(adjustedTasks, t);
      const supply = calculateSBFforBDR(component.alpha, component.delta, t);
      
      if (demand > supply) {
        return false;
      }
    }
  } else if (component.schedulingAlgorithm === 'FPS') {
    // For FPS, check each task separately
    const sortedTasks = [...adjustedTasks].sort((a, b) => 
      (a.priority || 0) - (b.priority || 0)
    );
    
    for (let i = 0; i < sortedTasks.length; i++) {
      for (let t = 0; t <= bound; t += step) {
        const demand = calculateDBFforFPS(sortedTasks, t, i);
        const supply = calculateSBFforBDR(component.alpha, component.delta, t);
        
        if (demand > supply) {
          return false;
        }
      }
    }
  }
  
  return true;
};
