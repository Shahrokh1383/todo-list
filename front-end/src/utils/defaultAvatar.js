/**
 * Default Avatar Generator
 * Generates colorful avatar placeholders based on username
 */

/**
 * Generate consistent color from string
 * @param {string} str - Input string (username)
 * @returns {string} - Hex color
 */
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#6a0572', '#ab00c3', '#ff5722', '#4CAF50',
    '#2196F3', '#FFC107', '#e53935', '#9C27B0',
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get initials from username
 * @param {string} username - Full username
 * @returns {string} - Initials (2 characters max)
 */
const getInitials = (username) => {
  if (!username) return '?';
  
  const names = username.trim().split(/\s+/);
  
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

/**
 * Generate default avatar URL using UI Avatars API
 * @param {string} username - User's display name
 * @param {number} size - Avatar size in pixels
 * @returns {string} - Avatar URL
 */
export const getDefaultAvatar = (username, size = 100) => {
  const initials = getInitials(username);
  const color = stringToColor(username || 'default');
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${color.replace('#', '')}&color=fff&bold=true&rounded=true`;
};

/**
 * Generate SVG avatar inline (no external dependency)
 * @param {string} username - User's display name
 * @param {number} size - Avatar size
 * @returns {string} - SVG data URI
 */
export const generateSVGAvatar = (username, size = 100) => {
  const initials = getInitials(username);
  const color = stringToColor(username || 'default');
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".35em" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white">
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export default { getDefaultAvatar, generateSVGAvatar };