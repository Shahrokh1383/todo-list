import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import { compressImage, validateImage } from '../utils/imageCompression';
import { getDefaultAvatar, generateSVGAvatar } from '../utils/defaultAvatar';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, uploadAvatar, deleteAvatar, actionLoading } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const objectUrlRef = useRef(null);

  // ✅ GRANULAR LOADING STATES
  const [uploadState, setUploadState] = useState({
    isSelecting: false,
    isUploading: false,
    isDeleting: false,
    progress: 0,
  });

  const [previewImage, setPreviewImage] = useState(user?.avatar || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  // ✅ MEMORY LEAK FIX: Cleanup object URLs
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ✅ MEMORY LEAK FIX: Cleanup preview on unmount
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      addToast(validation.error, 'error');
      return;
    }

    setUploadState(prev => ({ ...prev, isSelecting: true }));

    try {
      // ✅ IMAGE COMPRESSION
      const compressedFile = await compressImage(file);
      setSelectedFile(compressedFile);

      // Create preview with cleanup
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(compressedFile);
      objectUrlRef.current = objectUrl;
      setPreviewImage(objectUrl);
    } catch (err) {
      addToast('Failed to process image. Please try another file.', 'error');
      console.error('Image processing error:', err);
    } finally {
      setUploadState(prev => ({ ...prev, isSelecting: false }));
    }
  }, [addToast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      addToast('Please select an image first', 'error');
      return;
    }

    // ✅ ABORT CONTROLLER: Cancel previous upload if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

    // ✅ OPTIMISTIC UPDATE
    const previousAvatar = user?.avatar;

    try {
      const result = await uploadAvatar(selectedFile, {
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadState(prev => ({ ...prev, progress: percentCompleted }));
        },
      });

      if (result.success) {
        addToast('Profile picture updated!', 'success');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      // ✅ ROLLBACK ON ERROR
      if (err.name === 'AbortError') {
        addToast('Upload cancelled', 'error');
        return;
      }

      setUploadState(prev => ({ ...prev, progress: 0 }));
      
      // Rollback optimistic update
      setPreviewImage(previousAvatar || generateSVGAvatar(user?.username));
      
      addToast(err.message || 'Failed to upload image', 'error');
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  }, [selectedFile, uploadAvatar, user, navigate, addToast]);

  const handleDeleteConfirm = useCallback(async () => {
    setUploadState(prev => ({ ...prev, isDeleting: true }));

    const result = await deleteAvatar();

    if (result.success) {
      setPreviewImage(generateSVGAvatar(user?.username));
      addToast('Profile picture deleted.', 'info');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } else {
      addToast(result.error || 'Failed to delete image', 'error');
    }

    setUploadState(prev => ({ ...prev, isDeleting: false }));
    setDeleteModalOpen(false);
  }, [deleteAvatar, user, addToast]);

  // ✅ DRAG & DROP VISUAL FEEDBACK
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileSelect({ target: { files: e.dataTransfer.files } });
    }
  }, [handleFileSelect]);

  const getAvatarDisplay = () => {
    if (previewImage) {
      return previewImage;
    }
    return generateSVGAvatar(user?.username);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h1 className="profile-title">Profile Settings</h1>
          <p className="profile-subtitle">Manage your profile information and avatar</p>
        </div>

        <div className="profile-content">
          {/* Avatar Section */}
          <div className="avatar-section">
            <label className="avatar-label">Profile Picture</label>

            <div
              className={`avatar-upload-container ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Upload profile picture area. Drag and drop or press Enter to select file."
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="avatar-preview">
                <img 
                  src={getAvatarDisplay()} 
                  alt="Profile Preview" 
                  className="avatar-preview-image"
                  loading="lazy"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                onChange={handleFileSelect}
                className="avatar-input"
                id="avatar-upload"
                disabled={uploadState.isUploading || uploadState.isDeleting}
                aria-label="Select profile picture file"
              />

              <label 
                htmlFor="avatar-upload" 
                className="avatar-upload-btn"
                aria-disabled={uploadState.isUploading || uploadState.isDeleting}
              >
                <i className="fas fa-upload"></i>
                <span>{uploadState.isSelecting ? 'Processing...' : 'Choose Image'}</span>
              </label>

              {/* ✅ PROGRESS BAR */}
              {uploadState.isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadState.progress}%</span>
                </div>
              )}

              <div className="avatar-hints">
                <span><i className="fas fa-info-circle"></i> Drag & drop or click to upload</span>
                <span><i className="fas fa-check-circle"></i> Max size: 2MB (auto-compressed)</span>
                <span><i className="fas fa-image"></i> Formats: JPG, PNG, GIF, WebP</span>
              </div>
            </div>

            <div className="avatar-actions">
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploadState.isUploading || uploadState.isDeleting || !selectedFile}
                aria-label="Save profile picture changes"
              >
                {uploadState.isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save Changes
                  </>
                )}
              </button>

              {user?.avatar && (
                <button
                  className="btn btn-danger"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={uploadState.isUploading || uploadState.isDeleting}
                  aria-label="Delete current profile picture"
                >
                  <i className="fas fa-trash"></i>
                  Delete Image
                </button>
              )}
            </div>
          </div>

          {/* User Info Section */}
          <div className="user-info-section">
            <label className="info-label">Account Information</label>

            <div className="info-card">
              <div className="info-row">
                <span className="info-label-text">Username:</span>
                <span className="info-value">{user?.username || 'N/A'}</span>
              </div>

              <div className="info-row">
                <span className="info-label-text">Email:</span>
                <span className="info-value">{user?.email || 'N/A'}</span>
              </div>

              <div className="info-row">
                <span className="info-label-text">Member Since:</span>
                <span className="info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Profile Picture"
        footer={
          <>
            <button 
              className="modal-btn modal-btn-cancel" 
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              className="modal-btn modal-btn-danger" 
              onClick={handleDeleteConfirm} 
              disabled={uploadState.isDeleting}
            >
              {uploadState.isDeleting ? 'Deleting...' : 'Delete Image'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete your profile picture? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default Profile;