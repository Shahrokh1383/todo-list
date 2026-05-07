import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const Dropdown = ({ isOpen, onClose, anchorPosition, children }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
      }, 0);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="dropdown-menu show"
      style={{
        position: 'fixed',
        top: `${anchorPosition.top}px`,
        left: `${anchorPosition.left}px`,
        zIndex: 1050
      }}
      role="menu"
    >
      {children}
    </div>,
    document.body
  );
};

export default Dropdown;