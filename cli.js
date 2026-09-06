#!/usr/bin/env node

/**
 * Pixiv Token Getter - CLI
 * Command-line tool entry point
 */

const fs = require('fs');
const path = require('path');

// Read version from package.json (single source of truth)
const pkg = require('./package.json');

/**
 * Save token to file (0600 permissions - the file contains secrets)
 */
function saveTokenToFile(tokenInfo, outputPath) {
  const obtainedAt = new Date();
  const output = {
    access_token: tokenInfo.access_token,
    refresh_token: tokenInfo.refresh_token,
    expires_in: tokenInfo.expires_in,
    expires_at: tokenInfo.expires_in
      ? new Date(obtainedAt.getTime() + tokenInfo.expires_in * 1000).toISOString()
      : null,
    token_type: tokenInfo.token_type,
    scope: tokenInfo.scope,
    user: tokenInfo.user,
    // 网页登录 cookie（如 PHPSESSID），下游网页抓取可复用；没有时不写入。
    ...(tokenInfo.web_cookies && Object.keys(tokenInfo.web_cookies).length
      ? { web_cookies: tokenInfo.web_cookies }
      : {}),
    obtained_at: obtainedAt.toISOString(),
  };

  const content = JSON.stringify(output, null, 2);
  fs.writeFileSync(outputPath, content, { encoding: 'utf8', mode: 0o600 });
  console.log('[+] Token saved to: ' + outputPath + ' (permissions 0600)');
}

/**
 * Show help message
 */
function showHelp() {
  console.log(
'Pixiv Token Getter - Get Pixiv login token using Puppeteer' + '\n' +
'' + '\n' +
'Usage:' + '\n' +
'  ptg [options]                    (short alias, recommended)' + '\n' +
'  pixiv-token-getter [options]     (full command name)' + '\n' +
'' + '\n' +
'Options:' + '\n' +
'  --interactive              Interactive login (opens browser window, manual login) - default mode' + '\n' +
'  --headless [user] [pass]   Headless login (automatic login with username and password)' + '\n' +
'                             Credentials may also come from PIXIV_USERNAME / PIXIV_PASSWORD' + '\n' +
'  --output=<file>            Specify output file path (default: pixiv-token.json)' + '\n' +
'  --version, -v              Show version' + '\n' +
'  --help, -h                 Show this help message' + '\n' +
'' + '\n' +
'Examples:' + '\n' +
'  ptg --interactive' + '\n' +
'  ptg --headless username password' + '\n' +
'  PIXIV_USERNAME=user PIXIV_PASSWORD=pass ptg --headless' + '\n' +
'  ptg --interactive --output=my-token.json' + '\n' +
'' + '\n' +
'Notes:' + '\n' +
'  - Interactive login: Browser window opens automatically, complete login in browser' + '\n' +
'  - Headless login: Requires correct username and password, no browser window shown' + '\n' +
'  - Passing the password via environment variables keeps it out of shell history' + '\n' +
'  - The browser profile is persisted (~/.config/pixiv-token-getter/profile), so after the' + '\n' +
'    first successful login you usually stay logged in on later runs (API: userDataDir option)' + '\n' +
'  - On success the output file also includes web_cookies (e.g. PHPSESSID) when available' + '\n' +
'  - Token files contain sensitive information and are written with 0600 permissions'
  );
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const mode = args.includes('--headless') ? '--headless' : '--interactive';
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg ? outputArg.split('=').slice(1).join('=') : 'pixiv-token.json';

  let username = null;
  let password = null;

  if (mode === '--headless') {
    const rest = args.slice(args.indexOf('--headless') + 1).filter((a) => !a.startsWith('--output='));
    username = rest[0] || null;
    password = rest[1] || null;

    // Reject option-looking arguments passed as credentials
    if (username && username.startsWith('--')) {
      console.error('[!] Error: Headless mode requires username and password\n');
      showHelp();
      process.exit(1);
    }

    // Fall back to environment variables (keeps secrets out of shell history)
    username = username || process.env.PIXIV_USERNAME || null;
    password = password || process.env.PIXIV_PASSWORD || null;

    if (!username || !password) {
      console.error('[!] Error: Headless mode requires username and password.');
      console.error('    Pass them as arguments, or set PIXIV_USERNAME and PIXIV_PASSWORD.\n');
      showHelp();
      process.exit(1);
    }
  }

  return { mode, outputFile, username, password };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('pixiv-token-getter v' + pkg.version);
    process.exit(0);
  }

  const { mode, outputFile, username, password } = parseArgs(args);

  // Require lazily so --help/--version work even without dependencies installed
  const { loginInteractive, loginHeadless } = require('./lib/pixiv-auth');

  try {
    let tokenInfo;

    if (mode === '--headless') {
      console.log('[!] Starting headless login with Puppeteer...');
      tokenInfo = await loginHeadless({ username, password });
    } else {
      console.log('[!] Starting interactive login with Puppeteer...');
      console.log('[i] Browser window will open shortly');
      console.log('[i] Please complete the login process in the browser window');
      console.log('[i] This may take a few minutes, please wait...\n');

      tokenInfo = await loginInteractive({
        onBrowserOpen: () => {
          console.log('[+] Browser started\n');
        },
        onPageReady: (page, url) => {
          console.log('[i] Login URL: ' + url + '\n');
          console.log('[+] Login page opened');
          console.log('[!] Please complete login in the browser window...');
          console.log('[i] Waiting for login to complete...');
          console.log('[i] Browser window will close automatically after successful login\n');
        },
      });
    }

    // Output token information
    console.log('\n========== Token Information ==========');
    console.log('Access Token: ' + tokenInfo.access_token.substring(0, 20) + '...');
    console.log('Refresh Token: ' + tokenInfo.refresh_token.substring(0, 20) + '...');
    console.log('Expires In: ' + tokenInfo.expires_in + ' seconds');
    if (tokenInfo.expires_in) {
      console.log('Expires At: ' + new Date(Date.now() + tokenInfo.expires_in * 1000).toISOString());
    }
    console.log('Token Type: ' + tokenInfo.token_type);
    if (tokenInfo.user) {
      console.log('User: ' + tokenInfo.user.name + ' (ID: ' + tokenInfo.user.id + ')');
    }
    console.log('========================================\n');
    console.log('[i] Save the refresh token - it can be used to renew the access token later.');

    // Save to file
    const outputPath = path.resolve(process.cwd(), outputFile);
    saveTokenToFile(tokenInfo, outputPath);

    console.log('[+] Done!');
  } catch (error) {
    console.error('\n[!] Error:', error.message);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, saveTokenToFile };
