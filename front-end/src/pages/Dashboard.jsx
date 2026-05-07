import { useState, useMemo } from 'react';
import { useTodo } from '../context/TodoContext';
import { useToast } from '../context/ToastContext';
import TaskItem from '../components/dashboard/TaskItem';

export const Dashboard = () => {
  const { tasks, loading, loadingStates, addTask, currentFilter, setFilter } = useTodo();
  const { addToast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      const result = await addTask(
        newTaskTitle.trim(),
        newTaskPriority,
        newTaskDescription.trim(),
        newTaskDueDate || null
      );
      if (result.success) {
        addToast('Task added successfully!', 'success');
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskDueDate('');
        setNewTaskPriority('medium');
      } else {
        addToast(result.error || 'Failed to create task', 'error');
      }
    }
  };

  // Smart Sorting Logic
  const sortedTasks = useMemo(() => {
    const statusOrder = { 'todo': 1, 'in_progress': 2, 'done': 3 };
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };

    return [...tasks].sort((a, b) => {
      const statusA = a.status?.value || a.status;
      const statusB = b.status?.value || b.status;

      // 1. Sort by Status (Active tasks first)
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return (statusOrder[statusA] || 99) - (statusOrder[statusB] || 99);
      }

      // 2. Sort by Due Date (Closest date first, Nulls last)
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      
      if (dateA !== dateB) {
        return dateA - dateB; // Ascending (closest first)
      }

      // 3. Sort by Priority (High first)
      const prioA = a.priority?.value || a.priority;
      const prioB = b.priority?.value || b.priority;
      return (priorityOrder[prioA] || 99) - (priorityOrder[prioB] || 99);
    });
  }, [tasks]);

  return (
    <div className="dashboard-container">
      {/* Filters Section */}
      <div className="filters">
        <button
          className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${currentFilter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={`filter-btn ${currentFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {/* Input Section */}
      <form onSubmit={handleAddTask} className="input-section">
        <input
          type="text"
          placeholder="Task title..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="task-input"
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={newTaskDescription}
          onChange={(e) => setNewTaskDescription(e.target.value)}
          className="task-input"
          style={{ minHeight: '60px', resize: 'vertical' }}
        />
        <input
          type="date"
          value={newTaskDueDate}
          onChange={(e) => setNewTaskDueDate(e.target.value)}
          className="task-input"
          style={{ padding: '10px' }}
        />
        <select
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(e.target.value)}
          className="priority-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="btn-primary">
          <i className="fas fa-plus me-2"></i>
          Add Task
        </button>
      </form>

      {/* Task List */}
      {loading || loadingStates?.tasks ? (
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading tasks...</span>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-clipboard-list"></i>
          <p>No tasks found. Add a new task to get started!</p>
        </div>
      ) : (
        <ul className="todo-list">
          {sortedTasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;