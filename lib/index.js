/**
 * Pixiv Token Getter - Main API
 * Main API entry point
 */

const { loginInteractive, loginHeadless, collectWebCookies, DEFAULT_USER_DATA_DIR } = require('./pixiv-auth');

/**
 * Get token via interactive login
 * @param {Object} [options={}] - Login options
 * @param {boolean} [options.headless=false] - Use headless mode
 * @param {number} [options.timeout=300000] - Timeout in milliseconds
 * @param {Function} [options.onBrowserOpen] - Callback when browser opens
 * @param {Function} [options.onPageReady] - Callback when page is ready
 * @returns {Promise<Object>} Token information
 * 
 * @example
 * // Basic usage
 * const token = await getTokenInteractive();
 * 
 * @example
 * // With callbacks
 * const token = await getTokenInteractive({
 *   onBrowserOpen: (browser) => {
 *     console.log('Browser opened');
 *   },
 *   onPageReady: (page, url) => {
 *     console.log('Login page ready:', url);
 *   }
 * });
 */
async function getTokenInteractive(options = {}) {
  return await loginInteractive(options);
}

/**
 * Get token via headless login (username/password)
 * @param {Object} options - Login options
 * @param {string} options.username - Username
 * @param {string} options.password - Password
 * @param {number} [options.timeout=120000] - Timeout in milliseconds
 * @returns {Promise<Object>} Token information
 * 
 * @example
 * const token = await getTokenHeadless({
 *   username: 'your_username',
 *   password: 'your_password'
 * });
 */
async function getTokenHeadless(options) {
  if (!options || !options.username || !options.password) {
    throw new Error('Username and password are required for headless login');
  }
  return await loginHeadless(options);
}

/**
 * Token information structure
 * @typedef {Object} TokenInfo
 * @property {string} access_token - Access token
 * @property {string} refresh_token - Refresh token
 * @property {number} expires_in - Expiration time (seconds)
 * @property {string} token_type - Token type (usually 'bearer')
 * @property {string} scope - Permission scope
 * @property {Object} user - User information
 * @property {string} user.id - User ID
 * @property {string} user.name - Username
 * @property {string} user.account - User account
 * @property {Object} [web_cookies] - Pixiv web-session cookies (e.g. PHPSESSID) captured after login
 */

module.exports = {
  getTokenInteractive,
  getTokenHeadless,
  // Export low-level APIs (for advanced users)
  loginInteractive,
  loginHeadless,
  collectWebCookies: require('./pixiv-auth').collectWebCookies,
  DEFAULT_USER_DATA_DIR: require('./pixiv-auth').DEFAULT_USER_DATA_DIR,
};

// Default export
module.exports.default = {
  getTokenInteractive,
  getTokenHeadless,
};
