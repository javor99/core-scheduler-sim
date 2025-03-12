
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { SystemModel } from '@/types/system';

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
        const parsedModel = JSON.parse(content) as SystemModel;
        
        // Basic validation
        if (!parsedModel.cores || !Array.isArray(parsedModel.cores)) {
          throw new Error('Invalid model format: missing or invalid cores array');
        }
        
        if (!parsedModel.rootComponents || !Array.isArray(parsedModel.rootComponents)) {
          throw new Error('Invalid model format: missing or invalid rootComponents array');
        }
        
        onFileLoaded(parsedModel);
        toast({
          title: "File Loaded Successfully",
          description: `Loaded system model with ${parsedModel.cores.length} cores and ${parsedModel.rootComponents.length} root components.`,
        });
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
              accept=".json"
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
            Upload a JSON file containing your system model configuration.
          </p>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Expected File Format</h3>
          <p className="text-xs text-blue-700">
            The JSON file should define cores, components, and tasks in the hierarchical scheduling system.
            Each component specifies scheduling algorithm, tasks, and resource allocation parameters.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
