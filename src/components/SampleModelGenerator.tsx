
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SystemModel, PeriodicTask, SporadicTask, Component, Core } from '@/types/system';

interface SampleModelGeneratorProps {
  onModelGenerated: (model: SystemModel) => void;
}

const SampleModelGenerator: React.FC<SampleModelGeneratorProps> = ({ onModelGenerated }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const generateSampleModel = () => {
    // Sample 1: Simple dual-core system with hierarchical scheduling
    const sampleModel: SystemModel = {
      cores: [
        { id: '1', name: 'Core 1', performanceFactor: 1.0 },
        { id: '2', name: 'Core 2', performanceFactor: 0.8 } // 20% slower
      ],
      rootComponents: [
        // Core 1 root component (EDF scheduler)
        {
          id: 'core-1-root',
          name: 'Core 1 Root',
          schedulingAlgorithm: 'EDF',
          alpha: 1, // Full utilization at root level
          delta: 0, // No delay at root level
          tasks: [
            {
              id: 'task-1-1',
              name: 'Critical Control Task',
              type: 'periodic',
              wcet: 10,
              period: 50,
              deadline: 50
            } as PeriodicTask,
            {
              id: 'task-1-2',
              name: 'Sensor Processing',
              type: 'periodic',
              wcet: 5,
              period: 100,
              deadline: 100
            } as PeriodicTask
          ],
          childComponents: [
            {
              id: 'component-1-1',
              name: 'ADAS Subsystem',
              schedulingAlgorithm: 'FPS',
              alpha: 0.4, // 40% allocation
              delta: 50,  // Maximum delay
              tasks: [
                {
                  id: 'task-1-1-1',
                  name: 'Lane Detection',
                  type: 'sporadic',
                  wcet: 8,
                  minimumInterArrivalTime: 100,
                  deadline: 80,
                  priority: 1
                } as SporadicTask,
                {
                  id: 'task-1-1-2',
                  name: 'Object Recognition',
                  type: 'sporadic',
                  wcet: 12,
                  minimumInterArrivalTime: 150,
                  deadline: 100,
                  priority: 2
                } as SporadicTask
              ]
            }
          ]
        },
        
        // Core 2 root component (FPS scheduler)
        {
          id: 'core-2-root',
          name: 'Core 2 Root',
          schedulingAlgorithm: 'FPS',
          alpha: 1, // Full utilization at root level
          delta: 0, // No delay at root level
          tasks: [
            {
              id: 'task-2-1',
              name: 'System Monitor',
              type: 'periodic',
              wcet: 5,
              period: 200,
              deadline: 200,
              priority: 1
            } as PeriodicTask,
            {
              id: 'task-2-2',
              name: 'Data Logger',
              type: 'periodic',
              wcet: 10,
              period: 500,
              deadline: 500,
              priority: 2
            } as PeriodicTask
          ],
          childComponents: [
            {
              id: 'component-2-1',
              name: 'Infotainment',
              schedulingAlgorithm: 'EDF',
              alpha: 0.3, // 30% allocation
              delta: 100, // Maximum delay
              tasks: [
                {
                  id: 'task-2-1-1',
                  name: 'Media Player',
                  type: 'sporadic',
                  wcet: 15,
                  minimumInterArrivalTime: 200,
                  deadline: 150
                } as SporadicTask,
                {
                  id: 'task-2-1-2',
                  name: 'Navigation',
                  type: 'sporadic',
                  wcet: 20,
                  minimumInterArrivalTime: 300,
                  deadline: 250
                } as SporadicTask
              ]
            }
          ]
        }
      ]
    };
    
    onModelGenerated(sampleModel);
    setOpen(false);
    
    toast({
      title: "Sample Model Generated",
      description: "A dual-core system with hierarchical scheduling has been created."
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Generate Sample Model</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Sample Model</DialogTitle>
          <DialogDescription>
            Create a sample ADAS system configuration for testing the simulator and analyzer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="font-medium mb-2">Sample Model Details:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Dual-core system (one at 100% speed, one at 80% speed)</li>
            <li>Hierarchical scheduling with EDF and FPS schedulers</li>
            <li>Critical periodic tasks at the root level</li>
            <li>Sporadic tasks in child components</li>
            <li>Pre-configured BDR parameters (α, Δ)</li>
          </ul>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={generateSampleModel}>
            Generate Sample
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SampleModelGenerator;
