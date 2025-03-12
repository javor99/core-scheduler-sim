
import React from 'react';
import { SimulationResults } from '@/types/system';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import SimulationTimeline from './SimulationTimeline';

interface SimulationResultsViewProps {
  results: SimulationResults;
}

const SimulationResultsView: React.FC<SimulationResultsViewProps> = ({ results }) => {
  const responseTimeData = results.taskResponseTimes.map(rt => ({
    name: rt.taskId,
    average: rt.averageResponseTime,
    maximum: rt.maximumResponseTime,
    missed: rt.missedDeadlines
  }));

  const utilizationData = results.componentUtilizations.map(utilization => ({
    name: utilization.componentId,
    actual: utilization.utilization,
    allocated: utilization.allocatedUtilization
  }));

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Simulation Results</h3>
      <p className="text-gray-600">
        Simulation completed at {new Date(results.timestamp).toLocaleString()} 
        for {results.simulationTime} time units
      </p>
      
      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="timeline">Execution Timeline</TabsTrigger>
          <TabsTrigger value="details">Detailed Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="charts">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={responseTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="average" name="Avg Response Time" fill="#8884d8" />
                      <Bar dataKey="maximum" name="Max Response Time" fill="#82ca9d" />
                      <Line 
                        dataKey="missed" 
                        name="Missed Deadlines" 
                        stroke="#ff7300" 
                        activeDot={{ r: 8 }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Component Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={utilizationData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end"
                        height={80} 
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="actual" name="Actual Utilization" fill="#8884d8" />
                      <Bar dataKey="allocated" name="Allocated Utilization" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="timeline">
          {results.executionLogs ? (
            <SimulationTimeline 
              executionLogs={results.executionLogs} 
              simulationTime={results.simulationTime} 
            />
          ) : (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-md">
              No execution logs available. Run the simulation with 'Detailed Logging' enabled.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 text-left">Task ID</th>
                  <th className="p-3 text-left">Avg Response Time</th>
                  <th className="p-3 text-left">Max Response Time</th>
                  <th className="p-3 text-left">Missed Deadlines</th>
                </tr>
              </thead>
              <tbody>
                {results.taskResponseTimes.map((rt) => (
                  <tr key={rt.taskId} className="border-t">
                    <td className="p-3">{rt.taskId}</td>
                    <td className="p-3">{rt.averageResponseTime.toFixed(2)}</td>
                    <td className="p-3">{rt.maximumResponseTime.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`${rt.missedDeadlines > 0 ? 'text-red-500 font-bold' : 'text-green-500'}`}>
                        {rt.missedDeadlines}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimulationResultsView;
