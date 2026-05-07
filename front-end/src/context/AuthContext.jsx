import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({
    login: false,
    register: false,
    logout: false,
    uploadAvatar: false,
    deleteAvatar: false,
  });

  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (token && storedUser) {
      try {
        const response = await authAPI.me();
        if (isMounted.current) {
          setUser(response.data.data);
          localStorage.setItem('auth_user', JSON.stringify(response.data.data));
        }
      } catch (err) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        if (isMounted.current) {
          setUser(null);
        }
      }
    }
    if (isMounted.current) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password, remember = false) => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setActionLoading(prev => ({ ...prev, login: true }));
    setError(null);

    try {
      const response = await authAPI.login({ email, password, remember });
      const { user: userData, token } = response.data.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      if (isMounted.current) {
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message };
      }
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, login: false }));
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  const register = async (username, email, password, passwordConfirmation) => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setActionLoading(prev => ({ ...prev, register: true }));
    setError(null);

    try {
      const response = await authAPI.register({
        username,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      const { user: userData, token } = response.data.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      if (isMounted.current) {
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message, errors };
      }
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, register: false }));
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  const logout = async () => {
    if (!isMounted.current) return;

    setActionLoading(prev => ({ ...prev, logout: true }));

    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (isMounted.current) {
        setUser(null);
        setActionLoading(prev => ({ ...prev, logout: false }));
        navigate('/login');
      }
    }
  };

  const forgotPassword = async (email) => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setError(null);

    try {
      const response = await authAPI.forgotPassword(email);
      if (isMounted.current) {
        return { success: true, data: response.data.data };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset link.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message };
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  const resetPassword = async (email, password, passwordConfirmation, token) => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setError(null);

    try {
      const response = await authAPI.resetPassword({
        email,
        password,
        password_confirmation: passwordConfirmation,
        token,
      });
      if (isMounted.current) {
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message };
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.data;
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return { success: true, user: updatedUser };
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      const message = err.response?.data?.message || 'Profile update failed.';
      return { success: false, error: message, errors };
    }
  };

  // ✅ UPDATED: Support for Upload Progress & Abort Controller
  const uploadAvatar = async (file, options = {}) => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setActionLoading(prev => ({ ...prev, uploadAvatar: true }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // ✅ SUPPORT FOR UPLOAD PROGRESS & ABORT
      const response = await authAPI.uploadAvatar(formData, {
        signal: options.signal,
        onUploadProgress: options.onUploadProgress,
      });

      const avatarUrl = response.data.data.avatar_url;
      const updatedUser = { ...user, avatar: avatarUrl };

      if (isMounted.current) {
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return { success: true, avatarUrl };
      }
    } catch (err) {
      // ✅ HANDLE ABORT ERROR
      if (err.name === 'AbortError') {
        if (isMounted.current) {
          return { success: false, error: 'Upload cancelled' };
        }
      }

      const message = err.response?.data?.message || 'Avatar upload failed.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message };
      }
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, uploadAvatar: false }));
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  // ✅ ADDED: Delete Avatar with Loading State
  const deleteAvatar = async () => {
    if (!isMounted.current) return { success: false, error: 'Component unmounted' };

    setActionLoading(prev => ({ ...prev, deleteAvatar: true }));
    setError(null);

    try {
      const response = await authAPI.deleteAvatar();
      const updatedUser = { ...user, avatar: null };

      if (isMounted.current) {
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Avatar delete failed.';
      if (isMounted.current) {
        setError(message);
        return { success: false, error: message };
      }
    } finally {
      if (isMounted.current) {
        setActionLoading(prev => ({ ...prev, deleteAvatar: false }));
      }
    }

    return { success: false, error: 'Component unmounted' };
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        actionLoading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        uploadAvatar,
        deleteAvatar,
        clearError,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};