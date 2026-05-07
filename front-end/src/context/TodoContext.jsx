import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { taskAPI, folderAPI } from '../config/api';
import { useAuth } from './AuthContext';

const TodoContext = createContext(null);

export const TodoProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [folders, setFolders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState('all-tasks-folder');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    tasks: false,
    folders: false,
    stats: false,
    addTask: false,
    updateTask: false,
    deleteTask: false,
  });
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const foldersAbortRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (foldersAbortRef.current) foldersAbortRef.current.abort();
    };
  }, []);

  const clearState = useCallback(() => {
    setFolders([]);
    setTasks([]);
    setStats(null);
    setCurrentFolderId('all-tasks-folder');
    setCurrentFilter('all');
    setError(null);
    setLoading(false);
    setLoadingStates({
      tasks: false,
      folders: false,
      stats: false,
      addTask: false,
      updateTask: false,
      deleteTask: false,
    });
  }, []);

  const loadFolders = useCallback(async () => {
    if (!isMounted.current) return;
    if (foldersAbortRef.current) foldersAbortRef.current.abort();
    foldersAbortRef.current = new AbortController();
    setLoadingStates(prev => ({ ...prev, folders: true }));
    
    try {
      const response = await folderAPI.getAll(foldersAbortRef.current.signal);
      if (isMounted.current) {
        setFolders(response.data.data.items || []);
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (isMounted.current) console.error('Failed to load folders:', err);
    } finally {
      if (isMounted.current) setLoadingStates(prev => ({ ...prev, folders: false }));
    }
  }, []);

  const loadTasks = useCallback(async (params = {}) => {
    if (!isMounted.current) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setLoadingStates(prev => ({ ...prev, tasks: true }));
    
    try {
      const queryParams = { ...params };
      
      if (currentFolderId !== 'all-tasks-folder') queryParams.folder_id = currentFolderId;
      
      if (currentFilter === 'active') queryParams.status = 'todo,in_progress';
      else if (currentFilter === 'completed') queryParams.status = 'done';

      const response = await taskAPI.getAll(queryParams, abortControllerRef.current.signal);
      if (isMounted.current) setTasks(response.data.data.items || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (isMounted.current) {
        setError('Failed to load tasks');
        console.error('Failed to load tasks:', err);
      }
    } finally {
      if (isMounted.current) {
        setLoadingStates(prev => ({ ...prev, tasks: false }));
        setLoading(false);
      }
    }
  }, [currentFolderId, currentFilter]);

  const loadStats = useCallback(async () => {
    if (!isMounted.current) return;
    setLoadingStates(prev => ({ ...prev, stats: true }));
    try {
      const response = await taskAPI.getStats();
      if (isMounted.current) setStats(response.data.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (isMounted.current) console.error('Failed to load stats:', err);
    } finally {
      if (isMounted.current) setLoadingStates(prev => ({ ...prev, stats: false }));
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      Promise.all([loadFolders(), loadTasks(), loadStats()]);
    } else {
      clearState();
    }
  }, [isAuthenticated, authLoading, loadFolders, loadTasks, loadStats, clearState]);


  const refreshData = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) await Promise.all([loadFolders(), loadTasks(), loadStats()]);
  };

  const addTask = async (title, priority = 'medium', description = '', dueDate = null) => {
    setLoadingStates(prev => ({ ...prev, addTask: true }));
    const priorityValue = typeof priority === 'object' && priority !== null ? priority.value : priority;
    const tempId = Date.now();
    const tempTask = { id: tempId, title, description, priority: priorityValue, due_date: dueDate, folder_id: currentFolderId === 'all-tasks-folder' ? null : currentFolderId, status: 'todo', created_at: new Date().toISOString(), isTemp: true };
    
    setTasks((prev) => [tempTask, ...prev]);
    
    try {
      const taskData = { title, description, priority: priorityValue, due_date: dueDate, folder_id: currentFolderId === 'all-tasks-folder' ? null : currentFolderId, status: 'todo' };
      const response = await taskAPI.create(taskData);
      const newTask = response.data.data;
      setTasks((prev) => prev.map((t) => (t.id === tempId ? newTask : t)));
      await loadStats();
      return { success: true, task: newTask };
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      const message = err.response?.data?.message || 'Failed to create task';
      return { success: false, error: message };
    } finally {
      setLoadingStates(prev => ({ ...prev, addTask: false }));
    }
  };

  const updateTask = async (id, data) => {
    setLoadingStates(prev => ({ ...prev, updateTask: true }));
    
    setTasks((prev) => {
      const existingTaskIndex = prev.findIndex(t => t.id === id);
      if (existingTaskIndex === -1) return prev;

      const existingTask = prev[existingTaskIndex];
      const updatedTask = { ...existingTask, ...data };

      if (currentFilter === 'active' && updatedTask.status === 'done') {
        return prev.filter(t => t.id !== id);
      }
      
      if (currentFilter === 'completed' && updatedTask.status !== 'done') {
        return prev.filter(t => t.id !== id);
      }

      return prev.map(t => (t.id === id ? updatedTask : t));
    });

    try {
      const response = await taskAPI.update(id, data);
      const serverTask = response.data.data;
      
      setTasks((prev) => {
        if (prev.find(t => t.id === id)) {
           return prev.map(t => (t.id === id ? serverTask : t));
        }
        return prev;
      });

      await loadStats();
      return { success: true, task: serverTask };
    } catch (err) {
      loadTasks(); 
      const message = err.response?.data?.message || 'Failed to update task';
      return { success: false, error: message };
    } finally {
      setLoadingStates(prev => ({ ...prev, updateTask: false }));
    }
  };

  const deleteTask = async (id) => {
    setLoadingStates(prev => ({ ...prev, deleteTask: true }));
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await taskAPI.forceDelete(id);
      await loadStats();
      return { success: true };
    } catch (err) {
      setTasks(previousTasks);
      return { success: false, error: err.response?.data?.message };
    } finally {
      setLoadingStates(prev => ({ ...prev, deleteTask: false }));
    }
  };
  
  const toggleTaskStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    return updateTask(id, { status: newStatus });
  };

  const updateTaskStatus = async (id, status) => {
    return updateTask(id, { status });
  };
  
  const addFolder = async (name) => {
    try {
      const response = await folderAPI.create({ name });
      const newFolder = response.data.data;
      if (isMounted.current) {
        setFolders((prev) => [...prev, { ...newFolder, tasks_count: newFolder.tasks_count || 0 }]);
      }
      return { success: true, folder: newFolder };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create folder';
      const errors = err.response?.data?.errors || {};
      return { success: false, error: message, errors };
    }
  };

  const updateFolder = async (id, name) => {
    try {
      const response = await folderAPI.update(id, { name });
      const updatedFolder = response.data.data;
      setFolders((prev) => prev.map((f) => (f.id === id ? updatedFolder : f)));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update folder';
      return { success: false, error: message };
    }
  };

  const forceDeleteFolder = async (id) => {
    try {
      await folderAPI.forceDelete(id);
      
      setFolders((prev) => prev.filter((f) => f.id !== id));
      
      setTasks((prev) => prev.filter((task) => task.folder_id !== id));
      
      if (currentFolderId === id) setCurrentFolderId('all-tasks-folder');

      await loadStats();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const selectFolder = (folderId) => setCurrentFolderId(folderId);
  const setFilter = (filter) => setCurrentFilter(filter);
  const isTaskCompleted = (status) => status === 'done';

  return (
    <TodoContext.Provider
      value={{
        folders, tasks, stats, currentFolderId, currentFilter, loading, loadingStates, error,
        selectFolder, setFilter,
        addTask, toggleTaskStatus, updateTaskStatus, updateTask, deleteTask,
        addFolder, updateFolder, forceDeleteFolder,
        refreshData, isTaskCompleted,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodo must be used within a TodoProvider');
  return context;
};