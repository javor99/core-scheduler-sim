
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { SystemModel, SimulationResults } from '@/types/system';
import CoreVisualizer from './CoreVisualizer';
import ComponentView from './ComponentView';
import SimulationResultsView from './SimulationResultsView';

interface SimulatorPanelProps {
  systemModel: SystemModel | null;
  onRunSimulation: (simulationTime: number, detailedLogging: boolean) => Promise<SimulationResults>;
}

const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ 
  systemModel, 
  onRunSimulation 
}) => {
  const [simulationTime, setSimulationTime] = useState(1000);
  const [detailedLogging, setDetailedLogging] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const { toast } = useToast();

  const handleRunSimulation = async () => {
    if (!systemModel) {
      toast({
        title: "Error",
        description: "No system model loaded. Please upload a configuration file.",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);
    try {
      const results = await onRunSimulation(simulationTime, detailedLogging);
      setResults(results);
      toast({
        title: "Simulation Complete",
        description: `Simulated ${simulationTime} time units with ${results.taskResponseTimes.length} tasks.`
      });
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">Simulator</h2>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="simulation-time">Simulation Time</Label>
              <Input
                id="simulation-time"
                type="number"
                value={simulationTime}
                onChange={(e) => setSimulationTime(Number(e.target.value))}
                min={1}
                max={10000}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simulation-slider">Simulation Time Slider</Label>
              <Slider
                id="simulation-slider"
                value={[simulationTime]}
                onValueChange={(values) => setSimulationTime(values[0])}
                min={1}
                max={10000}
                step={1}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="detailed-logging" 
              checked={detailedLogging} 
              onCheckedChange={(checked) => setDetailedLogging(checked === true)}
            />
            <Label htmlFor="detailed-logging">
              Enable Detailed Execution Logging
              <p className="text-sm text-gray-500">
                Tracks task execution for timeline visualization. May slow down simulation.
              </p>
            </Label>
          </div>
          
          <Button 
            onClick={handleRunSimulation}
            disabled={isSimulating || !systemModel}
            className="w-full"
          >
            {isSimulating ? "Simulating..." : "Run Simulation"}
          </Button>
        </div>
        
        {systemModel && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">System Configuration</h3>
            {systemModel.cores.map((core) => (
              <CoreVisualizer key={core.id} core={core}>
                {systemModel.rootComponents
                  .filter(component => component.id.startsWith(`core-${core.id}`))
                  .map(component => (
                    <ComponentView key={component.id} component={component} />
                  ))
                }
              </CoreVisualizer>
            ))}
          </div>
        )}
        
        {results && <SimulationResultsView results={results} />}
      </div>
    </div>
  );
};

export default SimulatorPanel;
