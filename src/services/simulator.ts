
/**
 * Simulator implementation for the hierarchical scheduling system
 */
import { 
  SystemModel, 
  Component, 
  Task, 
  PeriodicTask, 
  SporadicTask,
  SimulationResults,
  TaskResponseTime,
  ComponentUtilization
} from "@/types/system";

interface SimulationEvent {
  time: number;
  type: 'arrival' | 'deadline' | 'completion' | 'resource-supply-start' | 'resource-supply-end';
  taskId: string;
  componentId: string;
}

interface TaskInstance {
  taskId: string;
  instanceId: number;
  componentId: string;
  arrivalTime: number;
  executionTime: number; // Adjusted execution time based on core performance
  remainingTime: number;
  deadline: number;
  priority?: number;
}

interface SimulationState {
  currentTime: number;
  events: SimulationEvent[];
  readyQueue: TaskInstance[];
  activeTask: TaskInstance | null;
  completedTasks: TaskInstance[];
  responseTimeByTask: Map<string, number[]>;
  missedDeadlinesByTask: Map<string, number>;
  executionTimeByComponent: Map<string, number>;
  resourceAvailableByComponent: Map<string, boolean>;
}

/**
 * Run a simulation for the given system model
 */
export const runSimulation = (
  systemModel: SystemModel, 
  simulationTime: number
): SimulationResults => {
  // Setup initial simulation state
  const state: SimulationState = {
    currentTime: 0,
    events: [],
    readyQueue: [],
    activeTask: null,
    completedTasks: [],
    responseTimeByTask: new Map(),
    missedDeadlinesByTask: new Map(),
    executionTimeByComponent: new Map(),
    resourceAvailableByComponent: new Map(),
  };
  
  // Initialize missed deadlines counter for each task
  const allTasks = getAllTasks(systemModel);
  allTasks.forEach(taskInfo => {
    state.missedDeadlinesByTask.set(taskInfo.task.id, 0);
    state.responseTimeByTask.set(taskInfo.task.id, []);
  });
  
  // Initialize component resource availability
  systemModel.rootComponents.forEach(component => {
    initializeComponentResourceAvailability(component, state);
  });
  
  // Generate initial periodic task arrivals and resource supply events
  systemModel.rootComponents.forEach(component => {
    generateInitialEvents(component, systemModel, state, simulationTime);
  });
  
  // Main simulation loop
  while (state.currentTime < simulationTime && state.events.length > 0) {
    // Get next event
    state.events.sort((a, b) => a.time - b.time);
    const event = state.events.shift()!;
    state.currentTime = event.time;
    
    // Handle the event
    switch (event.type) {
      case 'arrival':
        handleTaskArrival(event, systemModel, state, simulationTime);
        break;
      case 'deadline':
        handleTaskDeadline(event, state);
        break;
      case 'completion':
        handleTaskCompletion(event, systemModel, state, simulationTime);
        break;
      case 'resource-supply-start':
        handleResourceSupplyStart(event, state);
        break;
      case 'resource-supply-end':
        handleResourceSupplyEnd(event, state);
        break;
    }
    
    // Schedule next task to execute if needed
    scheduleNextTask(state, systemModel);
  }
  
  // Prepare simulation results
  const taskResponseTimes: TaskResponseTime[] = [];
  state.responseTimeByTask.forEach((times, taskId) => {
    if (times.length > 0) {
      const avgResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxResponseTime = Math.max(...times);
      const missedDeadlines = state.missedDeadlinesByTask.get(taskId) || 0;
      
      taskResponseTimes.push({
        taskId,
        averageResponseTime: avgResponseTime,
        maximumResponseTime: maxResponseTime,
        missedDeadlines
      });
    } else {
      taskResponseTimes.push({
        taskId,
        averageResponseTime: 0,
        maximumResponseTime: 0,
        missedDeadlines: 0
      });
    }
  });
  
  // Calculate component utilizations
  const componentUtilizations: ComponentUtilization[] = [];
  state.executionTimeByComponent.forEach((executionTime, componentId) => {
    const component = findComponentById(systemModel, componentId);
    if (component) {
      componentUtilizations.push({
        componentId,
        utilization: executionTime / simulationTime,
        allocatedUtilization: component.alpha || 0
      });
    }
  });
  
  return {
    taskResponseTimes,
    componentUtilizations,
    simulationTime,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle task arrival event - add the task to the ready queue
 */
const handleTaskArrival = (
  event: SimulationEvent, 
  systemModel: SystemModel, 
  state: SimulationState,
  simulationTime: number
) => {
  const taskInfo = findTaskById(systemModel, event.taskId);
  if (!taskInfo) return;
  
  const { task, component, core } = taskInfo;
  
  // Calculate adjusted execution time based on core performance
  const adjustedExecutionTime = task.wcet / (core?.performanceFactor || 1);
  
  // Create a new task instance
  const taskInstance: TaskInstance = {
    taskId: task.id,
    instanceId: Math.floor(Math.random() * 1000000), // Unique identifier for this instance
    componentId: component.id,
    arrivalTime: event.time,
    executionTime: adjustedExecutionTime,
    remainingTime: adjustedExecutionTime,
    deadline: event.time + task.deadline,
    priority: task.priority
  };
  
  // Add task to ready queue
  state.readyQueue.push(taskInstance);
  
  // Add deadline event
  state.events.push({
    time: taskInstance.deadline,
    type: 'deadline',
    taskId: task.id,
    componentId: component.id
  });
  
  // Schedule next arrival for periodic tasks
  if ((task as PeriodicTask).period) {
    const nextArrivalTime = event.time + (task as PeriodicTask).period;
    if (nextArrivalTime < simulationTime) {
      state.events.push({
        time: nextArrivalTime,
        type: 'arrival',
        taskId: task.id,
        componentId: component.id
      });
    }
  }
  // For sporadic tasks, we would generate their arrivals randomly, but for simplicity,
  // we'll just treat them as periodic with minimumInterArrivalTime as their period
  else if ((task as SporadicTask).minimumInterArrivalTime) {
    const nextArrivalTime = event.time + (task as SporadicTask).minimumInterArrivalTime;
    if (nextArrivalTime < simulationTime) {
      state.events.push({
        time: nextArrivalTime,
        type: 'arrival',
        taskId: task.id,
        componentId: component.id
      });
    }
  }
};

/**
 * Handle task deadline event - check if the task has completed
 */
const handleTaskDeadline = (event: SimulationEvent, state: SimulationState) => {
  // Check if task is still in ready queue or active task
  const isActive = state.activeTask?.taskId === event.taskId;
  const isInReadyQueue = state.readyQueue.some(task => task.taskId === event.taskId);
  
  if (isActive || isInReadyQueue) {
    // Task has missed its deadline
    const missedCount = state.missedDeadlinesByTask.get(event.taskId) || 0;
    state.missedDeadlinesByTask.set(event.taskId, missedCount + 1);
  }
};

/**
 * Handle task completion event
 */
const handleTaskCompletion = (
  event: SimulationEvent, 
  systemModel: SystemModel, 
  state: SimulationState,
  simulationTime: number
) => {
  if (!state.activeTask) return;
  
  // Mark task as completed
  const completedTask = { ...state.activeTask };
  completedTask.remainingTime = 0;
  state.completedTasks.push(completedTask);
  
  // Calculate response time
  const responseTime = state.currentTime - completedTask.arrivalTime;
  const responseTimeArray = state.responseTimeByTask.get(completedTask.taskId) || [];
  responseTimeArray.push(responseTime);
  state.responseTimeByTask.set(completedTask.taskId, responseTimeArray);
  
  // Clear active task
  state.activeTask = null;
};

/**
 * Handle resource supply start event - mark the component as having resource available
 */
const handleResourceSupplyStart = (event: SimulationEvent, state: SimulationState) => {
  state.resourceAvailableByComponent.set(event.componentId, true);
};

/**
 * Handle resource supply end event - mark the component as not having resource available
 */
const handleResourceSupplyEnd = (event: SimulationEvent, state: SimulationState) => {
  state.resourceAvailableByComponent.set(event.componentId, false);
  
  // If the active task belongs to this component, preempt it
  if (state.activeTask && state.activeTask.componentId === event.componentId) {
    state.readyQueue.push(state.activeTask);
    state.activeTask = null;
  }
};

/**
 * Schedule the next task to execute based on scheduling algorithm
 */
const scheduleNextTask = (state: SimulationState, systemModel: SystemModel) => {
  if (state.activeTask) return; // Already have an active task
  if (state.readyQueue.length === 0) return; // No tasks to schedule
  
  // Group tasks by component for scheduling decisions
  const tasksByComponent = new Map<string, TaskInstance[]>();
  state.readyQueue.forEach(task => {
    const tasks = tasksByComponent.get(task.componentId) || [];
    tasks.push(task);
    tasksByComponent.set(task.componentId, tasks);
  });
  
  // Find highest priority task that can be executed
  let selectedTask: TaskInstance | null = null;
  
  tasksByComponent.forEach((tasks, componentId) => {
    // Check if the component has resource available
    if (state.resourceAvailableByComponent.get(componentId) !== true) {
      return; // No resource available for this component
    }
    
    // Get component's scheduling algorithm
    const component = findComponentById(systemModel, componentId);
    if (!component) return;
    
    // Schedule based on algorithm
    if (component.schedulingAlgorithm === 'EDF') {
      // EDF - pick task with earliest deadline
      tasks.sort((a, b) => a.deadline - b.deadline);
    } else if (component.schedulingAlgorithm === 'FPS') {
      // FPS - pick task with highest priority (lower number = higher priority)
      tasks.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    }
    
    // If we don't have a task selected yet, or this task has higher priority
    if (!selectedTask || 
        (component.schedulingAlgorithm === 'EDF' && tasks[0].deadline < selectedTask.deadline) ||
        (component.schedulingAlgorithm === 'FPS' && (tasks[0].priority || 0) < (selectedTask.priority || 0))) {
      selectedTask = tasks[0];
    }
  });
  
  if (selectedTask) {
    // Remove from ready queue
    state.readyQueue = state.readyQueue.filter(
      task => !(task.taskId === selectedTask!.taskId && task.instanceId === selectedTask!.instanceId)
    );
    
    // Set as active task
    state.activeTask = selectedTask;
    
    // Schedule completion event
    state.events.push({
      time: state.currentTime + selectedTask.remainingTime,
      type: 'completion',
      taskId: selectedTask.taskId,
      componentId: selectedTask.componentId
    });
    
    // Update component execution time tracking
    const currentExecutionTime = state.executionTimeByComponent.get(selectedTask.componentId) || 0;
    state.executionTimeByComponent.set(
      selectedTask.componentId, 
      currentExecutionTime + selectedTask.remainingTime
    );
  }
};

/**
 * Initialize resource supply events for a component based on BDR parameters
 */
const initializeComponentResourceAvailability = (component: Component, state: SimulationState) => {
  // Root components always have resource available
  state.resourceAvailableByComponent.set(component.id, true);
  
  // Child components initially don't have resource available
  if (component.childComponents) {
    component.childComponents.forEach(child => {
      state.resourceAvailableByComponent.set(child.id, false);
      
      // Initialize recursively for nested components
      if (child.childComponents) {
        initializeComponentResourceAvailability(child, state);
      }
    });
  }
};

/**
 * Generate initial events for task arrivals and resource supply
 */
const generateInitialEvents = (
  component: Component, 
  systemModel: SystemModel, 
  state: SimulationState,
  simulationTime: number
) => {
  // Generate task arrival events
  component.tasks.forEach(task => {
    // Initial arrival at time 0
    state.events.push({
      time: 0,
      type: 'arrival',
      taskId: task.id,
      componentId: component.id
    });
  });
  
  // Generate resource supply events for child components
  if (component.childComponents) {
    component.childComponents.forEach(child => {
      // If BDR parameters are specified
      if (child.alpha !== undefined && child.delta !== undefined) {
        // Apply Half-Half algorithm to get budget and period
        const supplyPeriod = 2 * child.delta;
        const supplyBudget = child.alpha * supplyPeriod;
        
        // Generate supply events throughout the simulation
        let time = 0;
        while (time < simulationTime) {
          // Start of supply
          state.events.push({
            time,
            type: 'resource-supply-start',
            taskId: '', // No specific task
            componentId: child.id
          });
          
          // End of supply
          state.events.push({
            time: time + supplyBudget,
            type: 'resource-supply-end',
            taskId: '', // No specific task
            componentId: child.id
          });
          
          time += supplyPeriod;
        }
      }
      
      // Recursively generate events for nested components
      generateInitialEvents(child, systemModel, state, simulationTime);
    });
  }
};

/**
 * Helper to find a task and its component by ID
 */
const findTaskById = (systemModel: SystemModel, taskId: string) => {
  for (const core of systemModel.cores) {
    for (const component of systemModel.rootComponents.filter(c => c.id.startsWith(`core-${core.id}`))) {
      // Check tasks in the component
      const foundTask = component.tasks.find(t => t.id === taskId);
      if (foundTask) {
        return { task: foundTask, component, core };
      }
      
      // Check tasks in child components
      if (component.childComponents) {
        for (const childComponent of component.childComponents) {
          const foundTask = childComponent.tasks.find(t => t.id === taskId);
          if (foundTask) {
            return { task: foundTask, component: childComponent, core };
          }
        }
      }
    }
  }
  return null;
};

/**
 * Helper to find a component by ID
 */
const findComponentById = (systemModel: SystemModel, componentId: string): Component | null => {
  // Check root components
  const rootComponent = systemModel.rootComponents.find(c => c.id === componentId);
  if (rootComponent) {
    return rootComponent;
  }
  
  // Check child components
  for (const root of systemModel.rootComponents) {
    if (root.childComponents) {
      const childComponent = root.childComponents.find(c => c.id === componentId);
      if (childComponent) {
        return childComponent;
      }
    }
  }
  
  return null;
};

/**
 * Helper to get all tasks in the system
 */
const getAllTasks = (systemModel: SystemModel) => {
  const allTasks: { task: Task, component: Component, core?: any }[] = [];
  
  for (const core of systemModel.cores) {
    for (const component of systemModel.rootComponents.filter(c => c.id.startsWith(`core-${core.id}`))) {
      // Add tasks from this component
      component.tasks.forEach(task => {
        allTasks.push({ task, component, core });
      });
      
      // Add tasks from child components
      if (component.childComponents) {
        for (const childComponent of component.childComponents) {
          childComponent.tasks.forEach(task => {
            allTasks.push({ task, component: childComponent, core });
          });
        }
      }
    }
  }
  
  return allTasks;
};
