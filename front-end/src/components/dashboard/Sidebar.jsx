import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodo } from '../../context/TodoContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import Dropdown from '../ui/Dropdown';
import { getDefaultAvatar } from '../../utils/defaultAvatar';

export const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { folders, currentFolderId, selectFolder, addFolder, updateFolder, forceDeleteFolder } = useTodo();
  const { user, logout } = useAuth();
  const avatarRef = useRef(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [editName, setEditName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Profile Dropdown State
  const [isProfileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // --- Handlers ---

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      const result = await addFolder(newFolderName.trim());
      if (result.success) {
        setNewFolderName('');
        selectFolder(result.folder.id);
      } else {
        alert(result.error || 'Failed to create folder');
      }
    }
  };

  const openEditModal = (e, folder) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setEditName(folder.name);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim() || !selectedFolder) return;
    setIsProcessing(true);
    const result = await updateFolder(selectedFolder.id, editName.trim());
    setIsProcessing(false);
    if (result.success) setEditModalOpen(false);
    else alert(result.error || 'Failed to update');
  };

  const openDeleteModal = (e, folder) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFolder) return;
    setIsProcessing(true);
    const result = await forceDeleteFolder(selectedFolder.id);
    setIsProcessing(false);
    if (result.success) setDeleteModalOpen(false);
    else alert(result.error || 'Failed to delete');
  };

  const handleFolderClick = (folderId) => {
    selectFolder(folderId);
    if (window.innerWidth <= 992 && isOpen) onClose();
  };

  // --- Profile Dropdown Logic (FIXED) ---

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
      setProfileDropdownOpen(prev => !prev);
    }
  };

  const handleProfileClick = () => {
    setProfileDropdownOpen(false);
    navigate('/profile');
  };

  const handleLogoutClick = async () => {
    setProfileDropdownOpen(false);
    await logout();
  };

  const avatarSrc = user?.avatar || getDefaultAvatar(user?.username);

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'show' : ''}`} id="sidebar">
        {/* User Section - Modern & Minimal */}
        <div className="user-section">
          <div 
            className="d-flex align-items-center gap-3"
            ref={avatarRef}
            onClick={handleAvatarClick}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAvatarClick(e); }}
            tabIndex={0}
            role="button"
            aria-label="Open profile menu"
            aria-expanded={isProfileDropdownOpen}
            style={{ cursor: 'pointer' }}
          >
            <div className="user-avatar">
              <img 
                src={avatarSrc} 
                alt={`${user?.username || 'User'} profile`}
                className="avatar-image"
                loading="lazy"
              />
            </div>
            <div className="d-flex flex-column">
              <span className="user-name fw-bold text-white">
                {user?.username || 'Guest User'}
              </span>
              <small className="text-main" style={{ fontSize: '0.75rem' }}>
                View Profile & Settings <i className="fas fa-chevron-right ms-1" style={{ fontSize: '0.6rem' }}></i>
              </small>
            </div>
          </div>
        </div>

        <h2 className="sidebar-title">Folders</h2>
        <div className="folder-input-container">
          <form onSubmit={handleAddFolder} style={{ display: 'flex', width: '100%' }}>
            <input
              type="text"
              id="folder-input"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="folder-input"
            />
            <button type="submit" id="add-folder-btn">
              <i className="fas fa-plus"></i>
            </button>
          </form>
        </div>

        <ul className="folder-list" id="folder-list">
          <li
            className={`folder-item ${currentFolderId === 'all-tasks-folder' ? 'active' : ''}`}
            onClick={() => handleFolderClick('all-tasks-folder')}
          >
            <span className="folder-name-wrapper">
              <i className="fas fa-tasks me-2"></i>
              All Tasks
            </span>
          </li>
          {folders.map((folder) => (
            <li
              key={folder.id}
              className={`folder-item ${currentFolderId === folder.id ? 'active' : ''}`}
              onClick={() => handleFolderClick(folder.id)}
            >
              <span className="folder-name-wrapper">
                <i className="fas fa-folder me-2"></i>
                {folder.name}
              </span>
              <div className="folder-actions">
                <button className="edit-folder" onClick={(e) => openEditModal(e, folder)} title="Edit">
                  <i className="fas fa-edit"></i>
                </button>
                <button className="delete-folder" onClick={(e) => openDeleteModal(e, folder)} title="Delete">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Profile Dropdown Menu */}
      <Dropdown
        isOpen={isProfileDropdownOpen}
        onClose={() => setProfileDropdownOpen(false)}
        anchorPosition={dropdownPosition}
      >
        {/* Header inside Dropdown */}
        <div className="dropdown-header-modern">
            <img src={avatarSrc} alt={user?.username} className="dropdown-avatar-lg" />
            <div className="dropdown-user-info">
                <strong>{user?.username || 'Guest'}</strong>
                <small>{user?.email || ''}</small>
            </div>
        </div>
        <div className="dropdown-divider"></div>
        
        {/* Items */}
        <button className="dropdown-item-modern" onClick={handleProfileClick}>
            <i className="fas fa-user-circle"></i>
            <span>Profile Settings</span>
        </button>
        
        <button className="dropdown-item-modern text-danger" onClick={handleLogoutClick}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        </button>
      </Dropdown>

      {/* Modals */}
            <Modal
              isOpen={isEditModalOpen}
              onClose={() => setEditModalOpen(false)}
              title="Edit Folder"
              footer={
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setEditModalOpen(false)}>Cancel</button>
                  <button className="modal-btn btn-primary" onClick={handleEditSubmit} disabled={isProcessing}>
                    {isProcessing ? 'Saving...' : 'Save'}
                  </button>
                </>
              }
            >
              <div style={{ padding: '10px 0' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Folder Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="modal-input"
                  placeholder="Enter folder name"
                />
              </div>
            </Modal>
      
            <Modal
              isOpen={isDeleteModalOpen}
              onClose={() => setDeleteModalOpen(false)}
              title="Delete Folder"
              footer={
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                  <button className="modal-btn modal-btn-danger" onClick={handleDeleteConfirm} disabled={isProcessing}>
                    {isProcessing ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </>
              }
            >
              <p style={{ color: 'var(--text-main)' }}>
                Are you sure you want to permanently delete <strong>{selectedFolder?.name}</strong>?
                <br />
                <small style={{ color: 'var(--danger-color)', display: 'block', marginTop: '10px' }}>
                  Warning: All tasks inside this folder will also be deleted.
                </small>
              </p>
            </Modal>      
    </>
  );
};

export default Sidebar;