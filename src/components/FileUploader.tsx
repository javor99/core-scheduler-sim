
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { SystemModel } from '@/types/system';
import { parseTasksFromCSV, createSystemModelFromTasks } from '@/utils/csvParser';

interface FileUploaderProps {
  onFileLoaded: (model: SystemModel) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Determine file type based on extension
        const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                     file.name.toLowerCase().endsWith('.txt') ||
                     (content.includes('Task') && content.includes('WCET'));
        
        let parsedModel: SystemModel;
        
        if (isCSV) {
          // Parse CSV content
          const tasks = parseTasksFromCSV(content);
          if (tasks.length === 0) {
            throw new Error('No valid tasks found in the CSV file');
          }
          
          parsedModel = createSystemModelFromTasks(tasks);
          toast({
            title: "CSV Loaded Successfully",
            description: `Loaded ${tasks.length} tasks from CSV file.`,
          });
        } else {
          // Parse JSON content
          parsedModel = JSON.parse(content) as SystemModel;
          
          // Basic validation
          if (!parsedModel.cores || !Array.isArray(parsedModel.cores)) {
            throw new Error('Invalid model format: missing or invalid cores array');
          }
          
          if (!parsedModel.rootComponents || !Array.isArray(parsedModel.rootComponents)) {
            throw new Error('Invalid model format: missing or invalid rootComponents array');
          }
          
          toast({
            title: "JSON Loaded Successfully",
            description: `Loaded system model with ${parsedModel.cores.length} cores and ${parsedModel.rootComponents.length} root components.`,
          });
        }
        
        onFileLoaded(parsedModel);
      } catch (error) {
        toast({
          title: "Error Loading File",
          description: error instanceof Error ? error.message : "Invalid file format",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <div className="space-y-4">
        <div>
          <Label htmlFor="file-upload">System Configuration File</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,.csv,.txt"
            />
            <Button 
              onClick={handleButtonClick}
              variant="secondary"
              className="flex-1"
            >
              Select File
            </Button>
            <Input
              readOnly
              placeholder="No file selected"
              value={fileName || ''}
              className="flex-1"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Upload a JSON file with system model configuration, or a CSV/TXT file with task definitions.
          </p>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Supported File Formats</h3>
          <p className="text-xs text-blue-700">
            <strong>JSON:</strong> Complete system model with cores, components, and tasks.<br />
            <strong>CSV/TXT:</strong> Task definitions in format "Task BCET WCET Period Deadline Priority"
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
