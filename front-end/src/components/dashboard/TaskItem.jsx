import { useState } from 'react';
import { useTodo } from '../../context/TodoContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';

const escapeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const TaskItem = ({ task }) => {
  const { 
    toggleTaskStatus, 
    deleteTask, 
    isTaskCompleted, 
    updateTaskStatus,
    updateTask,
    currentFilter 
  } = useTodo();
  const { addToast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false); 
  
  const [editData, setEditData] = useState({
    title: task.title,
    description: task.description || '',
    due_date: task.due_date || '',
    priority: task.priority?.value || task.priority,
    status: task.status?.value || task.status,
  });

  // Animation Logic for Toggle
  const handleToggle = async (e) => {
    // FIX: Blur the checkbox immediately to prevent browser scroll-following behavior
    if (e && e.target) e.target.blur();

    const statusVal = task.status?.value || task.status;
    const newStatus = statusVal === 'done' ? 'todo' : 'done';
    
    const shouldFadeOut = 
      (currentFilter === 'active' && newStatus === 'done') || 
      (currentFilter === 'completed' && newStatus !== 'done');

    if (shouldFadeOut) {
      setIsExiting(true);
      setTimeout(async () => {
        await toggleTaskStatus(task.id, statusVal);
      }, 300);
    } else {
      await toggleTaskStatus(task.id, statusVal);
    }
  };

  // Animation Logic for Dropdown Status Change
  const handleStatusChange = async (e) => {
    // FIX: Blur the select element
    if (e && e.target) e.target.blur();
    
    const newStatus = e.target.value;

    const shouldFadeOut = 
      (currentFilter === 'active' && newStatus === 'done') || 
      (currentFilter === 'completed' && newStatus !== 'done');

    if (shouldFadeOut) {
      setIsExiting(true);
      setTimeout(async () => {
        await updateTaskStatus(task.id, newStatus);
      }, 300);
    } else {
      await updateTaskStatus(task.id, newStatus);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsProcessing(true);
    const result = await deleteTask(task.id);
    if (result.success) {
      addToast('Task deleted', 'success');
    } else {
      addToast(result.error || 'Delete failed', 'error');
    }
    setIsProcessing(false);
    setDeleteModalOpen(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    setIsProcessing(true);
    const result = await updateTask(task.id, editData);
    if (result.success) {
      addToast('Task updated', 'success');
    } else {
      addToast(result.error || 'Update failed', 'error');
    }
    setIsProcessing(false);
    setEditModalOpen(false);
  };

  const getPriorityColor = (priority) => {
    const val = typeof priority === 'object' && priority !== null ? priority.value : priority;
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
    };
    return colors[val] || colors.medium;
  };

  const getPriorityLabel = (priority) => {
    if (typeof priority === 'object' && priority !== null) return priority.label || priority.value;
    if (typeof priority === 'string') return priority.charAt(0).toUpperCase() + priority.slice(1);
    return 'Medium';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDueDateClass = (dateString) => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateString);
    due.setHours(0,0,0,0);
    
    const diffTime = due - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'due-soon';
    return '';
  };

  const getDueDateText = (dateString) => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dateString);
    due.setHours(0,0,0,0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return ' (Overdue)';
    if (diffDays === 0) return ' (Today)';
    if (diffDays === 1) return ' (Tomorrow)';
    return '';
  };

  return (
    <>
      <li
        className={`todo-item ${isTaskCompleted(task.status?.value || task.status) ? 'completed' : ''} priority-${typeof task.priority === 'object' ? task.priority?.value : task.priority} ${isExiting ? 'fade-out' : ''}`}
        style={{ opacity: isProcessing ? 0.5 : 1 }}
      >
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={isTaskCompleted(task.status?.value || task.status)}
          onChange={handleToggle}
          disabled={isProcessing}
        />

        <div className="todo-content">
          <span className="todo-text">{escapeHtml(task.title)}</span>
          {task.description && (
            <p className="todo-description">{escapeHtml(task.description)}</p>
          )}
          {task.due_date && (
            <span className={`todo-due-date ${getDueDateClass(task.due_date)}`}>
              <i className="fas fa-calendar-alt me-1"></i>
              {formatDate(task.due_date)}
              <span style={{ fontSize: '0.8em', marginLeft: '4px' }}>{getDueDateText(task.due_date)}</span>
            </span>
          )}
        </div>

        <div className="todo-meta">
          <span
            className="priority-badge"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          >
            {getPriorityLabel(task.priority)}
          </span>

          <select
            className="status-select"
            value={task.status?.value || task.status}
            onChange={handleStatusChange}
            disabled={isProcessing}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="todo-actions">
          <button
            className="edit-btn"
            onClick={() => setEditModalOpen(true)}
            disabled={isProcessing}
            title="Edit"
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            className="delete-btn"
            onClick={() => setDeleteModalOpen(true)}
            disabled={isProcessing}
            title="Delete Permanently"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </li>

      {/* Modals */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Task"
        footer={
          <>
            <button className="modal-btn modal-btn-cancel" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button className="modal-btn btn-primary" onClick={handleEditSubmit} disabled={isProcessing}>
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Title</label>
            <input type="text" name="title" value={editData.title} onChange={handleEditChange} className="modal-input" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Description</label>
            <textarea name="description" value={editData.description} onChange={handleEditChange} className="modal-input" rows="3" />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Due Date</label>
              <input type="date" name="due_date" value={editData.due_date} onChange={handleEditChange} className="modal-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Priority</label>
              <select name="priority" value={editData.priority} onChange={handleEditChange} className="modal-input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Status</label>
            <select name="status" value={editData.status} onChange={handleEditChange} className="modal-input">
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Task Permanently"
        footer={
          <>
            <button className="modal-btn modal-btn-cancel" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="modal-btn modal-btn-danger" onClick={handleDeleteConfirm} disabled={isProcessing}>
              {isProcessing ? 'Deleting...' : 'Delete Forever'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to permanently delete this task? This action cannot be undone.</p>
      </Modal>
    </>
  );
};

export default TaskItem;