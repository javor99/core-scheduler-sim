
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { SystemModel, AnalysisResults, Component } from '@/types/system';
import { calculateBDRInterface, applyHalfHalfAlgorithm } from '@/utils/schedulingFunctions';

interface AnalyzerPanelProps {
  systemModel: SystemModel | null;
}

const AnalyzerPanel: React.FC<AnalyzerPanelProps> = ({ systemModel }) => {
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const runAnalysis = async () => {
    if (!systemModel) {
      toast({
        title: "Error",
        description: "No system model loaded. Please upload a configuration file.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Simple timeout to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const componentInterfaces: AnalysisResults['componentInterfaces'] = [];
      let isSystemSchedulable = true;
      
      // Process each component to calculate its BDR interface
      const processComponent = (component: Component) => {
        // Calculate BDR interface parameters for this component
        const { alpha, delta } = calculateBDRInterface(component);
        
        // Apply Half-Half algorithm to get supply task parameters
        const { supplyBudget, supplyPeriod } = applyHalfHalfAlgorithm(alpha, delta);
        
        // Store this component's interface
        componentInterfaces.push({
          componentId: component.id,
          alpha,
          delta,
          supplyBudget,
          supplyPeriod
        });
        
        // Update the component's BDR parameters
        component.alpha = alpha;
        component.delta = delta;
        
        // If we're not schedulable, mark the whole system as unschedulable
        if (alpha > 1) {
          isSystemSchedulable = false;
        }
        
        // Recursively process child components
        if (component.childComponents) {
          component.childComponents.forEach(processComponent);
        }
      };
      
      // Process all root components
      systemModel.rootComponents.forEach(processComponent);
      
      // Create analysis results
      const analysisResults: AnalysisResults = {
        isSchedulable: isSystemSchedulable,
        componentInterfaces,
        timestamp: new Date().toISOString()
      };
      
      setResults(analysisResults);
      
      toast({
        title: "Analysis Complete",
        description: isSystemSchedulable 
          ? "System is schedulable with the given parameters"
          : "System is NOT schedulable with the given parameters",
        variant: isSystemSchedulable ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">Schedulability Analyzer</h2>
        
        <div className="mb-6">
          <Button 
            onClick={runAnalysis}
            disabled={isAnalyzing || !systemModel}
            className="w-full"
          >
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
        
        {results && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  Analysis completed at {new Date(results.timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-center p-4 rounded-md ${
                  results.isSchedulable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <h3 className="text-xl font-bold mb-2">
                    System is {results.isSchedulable ? 'Schedulable' : 'NOT Schedulable'}
                  </h3>
                  <p>
                    {results.isSchedulable
                      ? 'All tasks can meet their deadlines with the computed resource supply.'
                      : 'Some tasks may miss their deadlines with the current configuration.'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <h3 className="text-xl font-semibold">Component BDR Interfaces</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 text-left">Component ID</th>
                    <th className="p-3 text-left">Alpha (α)</th>
                    <th className="p-3 text-left">Delta (Δ)</th>
                    <th className="p-3 text-left">Supply Budget</th>
                    <th className="p-3 text-left">Supply Period</th>
                  </tr>
                </thead>
                <tbody>
                  {results.componentInterfaces.map((ci) => (
                    <tr key={ci.componentId} className="border-t">
                      <td className="p-3">{ci.componentId}</td>
                      <td className="p-3">{ci.alpha.toFixed(3)}</td>
                      <td className="p-3">{ci.delta.toFixed(2)}</td>
                      <td className="p-3">{ci.supplyBudget?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3">{ci.supplyPeriod?.toFixed(2) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzerPanel;
