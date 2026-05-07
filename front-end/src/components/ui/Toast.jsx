import { useEffect } from 'react';

const iconMap = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
};

const Toast = ({ id, message, type, exiting, onClose }) => {
  return (
    <div className={`toast toast-${type} ${exiting ? 'exit' : ''}`}>
      <i className={`fas ${iconMap[type] || 'fa-info-circle'} toast-icon`}></i>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Toast;