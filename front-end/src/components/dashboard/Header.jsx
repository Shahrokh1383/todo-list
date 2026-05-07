import { useTodo } from '../../context/TodoContext';

export const Header = ({ onMenuToggle }) => {
  const { tasks, currentFolderId, folders, stats } = useTodo();

  const getCurrentFolderName = () => {
    if (currentFolderId === 'all-tasks-folder') {
      return 'All Tasks';
    }
    const folder = folders.find((f) => f.id === currentFolderId);
    return folder ? folder.name : 'All Tasks';
  };

  const totalTasks = stats?.total || tasks.length;
  const completedTasks = stats?.completed || 0;
  const overdueTasks = stats?.overdue || 0;

  return (
    <div className="header">
      <div className="d-flex align-items-center">
        <button
          className="mobile-menu-toggle"
          id="mobile-menu-toggle"
          type="button"
          onClick={onMenuToggle}
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>☰</span>
        </button>
        <h1 id="current-folder">{getCurrentFolderName()}</h1>
      </div>
      <div className="stats d-none d-sm-block">
        <span id="task-count">
          <i className="fas fa-list me-1"></i>
          {totalTasks} Total
        </span>
        <span id="completed-count">
          <i className="fas fa-check-circle me-1"></i>
          {completedTasks} Completed
        </span>
        {overdueTasks > 0 && (
          <span id="overdue-count" style={{ color: '#EF4444' }}>
            <i className="fas fa-exclamation-circle me-1"></i>
            {overdueTasks} Overdue
          </span>
        )}
      </div>
    </div>
  );
};

export default Header;