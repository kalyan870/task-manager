import { Clock, Trash2, Edit3, ChevronDown } from 'lucide-react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800',
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(task)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between">
        {formattedDate && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" /> {formattedDate}
          </span>
        )}
        {task.status !== 'completed' && (
          <div className="relative group">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              Move to <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {task.status !== 'pending' && (
                <button onClick={() => onStatusChange(task.id, 'pending')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 whitespace-nowrap">Pending</button>
              )}
              {task.status !== 'in_progress' && (
                <button onClick={() => onStatusChange(task.id, 'in_progress')} className="block w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 whitespace-nowrap">In Progress</button>
              )}
              <button onClick={() => onStatusChange(task.id, 'completed')} className="block w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 whitespace-nowrap">Complete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
