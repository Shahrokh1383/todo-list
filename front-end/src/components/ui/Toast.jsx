import { useEffect } from 'react';

const iconMap = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  warning: 'fa-exclamation-triangle',
  info: 'fa-info-circle',
};

const Toast = ({ id, message, type, exiting, onClose }) => {
  return (
    <div className={`ui-toast ui-toast-${type} ${exiting ? 'ui-exit' : ''}`}>
      <i className={`fas ${iconMap[type] || 'fa-info-circle'} ui-toast-icon`}></i>
      <span className="ui-toast-message">{message}</span>
      <button className="ui-toast-close" onClick={onClose} aria-label="Close notification">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Toast;