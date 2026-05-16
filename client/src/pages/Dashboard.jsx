import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import toast from 'react-hot-toast';
import { Plus, Filter, Loader2 } from 'lucide-react';

const API = '/api';

export default function Dashboard() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState({ status: '', priority: '', sort: 'created_at' });

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.sort) params.set('sort', filter.sort);
      const res = await fetch(`${API}/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data.tasks);
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const socket = io();
    socket.on('task:created', (task) => {
      setTasks(prev => [task, ...prev]);
      toast.success(`New task: ${task.title}`);
    });
    socket.on('task:updated', (task) => {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    });
    socket.on('task:deleted', ({ id }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
    });
    return () => socket.disconnect();
  }, []);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setShowModal(true);
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      toast.success(`Task ${status === 'completed' ? 'completed' : 'updated'}`);
    } catch {
      toast.error('Failed to update task');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <button onClick={() => { setEditTask(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
          <Plus className="w-5 h-5" /> New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
          <option value="created_at">Newest First</option>
          <option value="due_date">Due Date</option>
          <option value="priority">Priority</option>
        </select>
        <button onClick={() => setFilter({ status: '', priority: '', sort: 'created_at' })}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" /> Clear
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No tasks yet</p>
          <button onClick={() => { setEditTask(null); setShowModal(true); }}
            className="mt-4 text-indigo-600 hover:underline font-medium">Create your first task</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSaved={() => { setShowModal(false); setEditTask(null); fetchTasks(); }}
          token={token}
        />
      )}
    </div>
  );
}
