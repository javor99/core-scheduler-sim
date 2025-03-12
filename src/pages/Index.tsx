
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { SystemModel, SimulationResults, AnalysisResults } from '@/types/system';
import FileUploader from '@/components/FileUploader';
import SampleModelGenerator from '@/components/SampleModelGenerator';
import SimulatorPanel from '@/components/SimulatorPanel';
import AnalyzerPanel from '@/components/AnalyzerPanel';
import { runSimulation } from '@/services/simulator';
import { analyzeSystem } from '@/services/analyzer';

const Index: React.FC = () => {
  const [systemModel, setSystemModel] = useState<SystemModel | null>(null);
  const { toast } = useToast();

  const handleFileLoaded = (model: SystemModel) => {
    setSystemModel(model);
  };

  const handleRunSimulation = async (simulationTime: number): Promise<SimulationResults> => {
    if (!systemModel) {
      throw new Error("No system model loaded");
    }
    
    // Run simulation with current model
    try {
      return runSimulation(systemModel, simulationTime);
    } catch (error) {
      console.error("Simulation error:", error);
      toast({
        title: "Simulation Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleRunAnalysis = async (): Promise<AnalysisResults> => {
    if (!systemModel) {
      throw new Error("No system model loaded");
    }
    
    // Run analysis with current model
    try {
      return analyzeSystem(systemModel);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-2">ADAS Hierarchical Scheduler</h1>
        <p className="text-gray-600 max-w-3xl text-center">
          Simulation and analysis tool for Advanced Driver-Assistance Systems (ADAS) 
          implemented on a multicore platform using hierarchical scheduling.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2 p-6">
          <h2 className="text-xl font-bold mb-4">Input Configuration</h2>
          <FileUploader onFileLoaded={handleFileLoaded} />
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Quick Start</h2>
          <p className="text-sm text-gray-600 mb-4">
            No configuration file ready? Generate a sample model to explore the tool's features.
          </p>
          <SampleModelGenerator onModelGenerated={setSystemModel} />
        </Card>
      </div>
      
      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="simulator" className="space-y-4">
          <SimulatorPanel 
            systemModel={systemModel} 
            onRunSimulation={handleRunSimulation}
          />
        </TabsContent>
        
        <TabsContent value="analyzer" className="space-y-4">
          <AnalyzerPanel systemModel={systemModel} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
