
import React from 'react';
import { Task, PeriodicTask, SporadicTask } from '@/types/system';

interface TaskListProps {
  tasks: (PeriodicTask | SporadicTask)[];
  title?: string;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title }) => {
  const isPeriodic = (task: Task): task is PeriodicTask => {
    return (task as PeriodicTask).period !== undefined;
  };

  return (
    <div className="mb-4">
      {title && <h3 className="text-md font-medium mb-2">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">BCET</th>
              <th className="p-2 text-left">WCET</th>
              <th className="p-2 text-left">Deadline</th>
              <th className="p-2 text-left">Period/MIT</th>
              <th className="p-2 text-left">Priority</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{task.name}</td>
                <td className="p-2">{task.type}</td>
                <td className="p-2">{task.bcet || '-'}</td>
                <td className="p-2">{task.wcet}</td>
                <td className="p-2">{task.deadline}</td>
                <td className="p-2">
                  {isPeriodic(task) ? task.period : (task as SporadicTask).minimumInterArrivalTime}
                </td>
                <td className="p-2">{task.priority || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
