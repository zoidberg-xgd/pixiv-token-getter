# Pixiv Token Getter

> A Node.js library and CLI tool to get Pixiv login tokens using Puppeteer. Easy to integrate into your projects.

**Also known as:** `ptg` (CLI command alias)

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[中文文档](./README.zh-CN.md) | [English](./README.md)

## Features

- ✅ **Easy Integration** - Clean API for easy integration
- ✅ **Two Login Modes** - Interactive and headless login
- ✅ **Persistent Profile** - Browser profile is cached (`~/.config/pixiv-token-getter/profile`), so you usually stay logged in across runs; pass `userDataDir: ''` for a fresh profile
- ✅ **Web Cookies** - On success, also captures Pixiv web-session cookies (e.g. `PHPSESSID`) as `web_cookies` for downstream web scraping
- ✅ **TypeScript Support** - Full TypeScript type definitions
- ✅ **CLI Tool** - Command-line interface
- ✅ **Flexible Configuration** - Customizable timeout, callbacks, and more

## Installation

```bash
npm install pixiv-token-getter
```

## Quick Start

### As a Library

#### Interactive Login (Recommended)

```javascript
const { getTokenInteractive } = require('pixiv-token-getter');

async function main() {
  try {
    const token = await getTokenInteractive({
      onBrowserOpen: () => {
        console.log('Browser opened, please complete login');
      },
    });

    console.log('Access Token:', token.access_token);
    console.log('User:', token.user.name);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

main();
```

#### Headless Login

```javascript
const { getTokenHeadless } = require('pixiv-token-getter');

async function main() {
  try {
    const token = await getTokenHeadless({
      username: 'your_username',
      password: 'your_password',
    });

    console.log('Access Token:', token.access_token);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

main();
```

#### ES6 Module Import

```javascript
import { getTokenInteractive, getTokenHeadless } from 'pixiv-token-getter';

const token = await getTokenInteractive();
```

### As a CLI Tool

After installation, you can use the CLI with `ptg` (short alias) or `pixiv-token-getter`:

#### Interactive Login

```bash
npm start
# or
node cli.js --interactive
# or (if installed globally)
ptg --interactive
# or
pixiv-token-getter --interactive
```

#### Headless Login

```bash
node cli.js --headless username password
# or (if installed globally)
ptg --headless username password
```

#### Specify Output File

```bash
node cli.js --interactive --output=my-token.json
# or (if installed globally)
ptg --interactive --output=my-token.json
```

## API Documentation

### `getTokenInteractive(options?)`

Get token via interactive login.

**Parameters:**

- `options` (optional):
  - `headless` (boolean): Use headless mode, default `false`
  - `timeout` (number): Timeout in milliseconds, default `300000` (5 minutes)
  - `onBrowserOpen` (function): Callback when browser opens
  - `onPageReady` (function): Callback when page is ready

**Returns:** `Promise<TokenInfo>`

**Example:**

```javascript
const token = await getTokenInteractive({
  timeout: 600000,
  onBrowserOpen: (browser) => {
    console.log('Browser opened');
  },
  onPageReady: (page, url) => {
    console.log('Login page:', url);
  },
});
```

### `getTokenHeadless(options)`

Get token via headless login (username/password).

**Parameters:**

- `options` (required):
  - `username` (string): Username
  - `password` (string): Password
  - `timeout` (number, optional): Timeout in milliseconds, default `120000` (2 minutes)

**Returns:** `Promise<TokenInfo>`

**Example:**

```javascript
const token = await getTokenHeadless({
  username: 'your_username',
  password: 'your_password',
  timeout: 300000,
});
```

### `TokenInfo` Type

```typescript
interface TokenInfo {
  access_token: string;      // Access token
  refresh_token: string;     // Refresh token
  expires_in: number;        // Expiration time (seconds)
  token_type: string;        // Token type (usually 'bearer')
  scope: string;             // Permission scope
  user: {                    // User information
    id: string;
    name: string;
    account: string;
  };
}
```

## Examples

### Save Token to Config File

```javascript
const { getTokenInteractive } = require('pixiv-token-getter');
const fs = require('fs');

async function saveToken() {
  const token = await getTokenInteractive();
  
  const config = {
    pixiv: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in * 1000),
      user: token.user,
    },
  };

  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  console.log('Token saved');
}

saveToken();
```

### Use in Express App

```javascript
const express = require('express');
const { getTokenInteractive } = require('pixiv-token-getter');

const app = express();
let cachedToken = null;

app.get('/api/pixiv/token', async (req, res) => {
  try {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return res.json({ token: cachedToken.accessToken });
    }

    const token = await getTokenInteractive();
    cachedToken = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in * 1000),
    };

    res.json({ token: cachedToken.accessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Use Token to Call Pixiv API

```javascript
const { getTokenInteractive } = require('pixiv-token-getter');
const axios = require('axios');

async function getRecommendedIllusts() {
  const token = await getTokenInteractive();

  const response = await axios.get('https://app-api.pixiv.net/v1/illust/recommended', {
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
    },
  });

  return response.data.illusts;
}

getRecommendedIllusts().then(illusts => {
  console.log('Got', illusts.length, 'recommended illustrations');
});
```

More examples in [examples](./examples/) directory.

## CLI Options

Use `ptg` or `pixiv-token-getter` command (if installed globally):

- `--interactive` - Interactive login mode (default)
- `--headless [username] [password]` - Headless login mode
- `--output=<file>` - Output file path (default: `pixiv-token.json`)
- `--version`, `-v` - Show version
- `--help`, `-h` - Show help message

**Environment variables:** In headless mode you can provide credentials via environment variables instead of arguments — this keeps your password out of shell history:

```bash
PIXIV_USERNAME=your_username PIXIV_PASSWORD=your_password ptg --headless
```

**CLI Alias:** The command is also available as `ptg` (short for Pixiv Token Getter) for convenience.

## Releasing

Releases are fully automatic — just follow [Conventional Commits](https://www.conventionalcommits.org/) and push to `main`. CI ([release.yml](./.github/workflows/release.yml)) analyses the commits since the last tag and decides:

| Commits since last tag          | Version bump | Example                          |
| ------------------------------- | ------------ | -------------------------------- |
| `feat!` / `fix!` / `BREAKING CHANGE:` | major        | `feat!: new api`                 |
| `feat`                          | minor        | `feat(cli): add --json flag`     |
| `fix` / `perf` / `revert`        | patch        | `fix: normalize token url`       |
| only `docs` / `chore` / `ci` / `test`... | none         | no release is cut                |

When a release is warranted it runs: tests on supported Node 22/24 → version bump + tag → `npm publish` via **trusted publishing** (OIDC, no token secret, with provenance) → GitHub Release with changelog. The repository commits `package-lock.json`; CI and local installs use the same dependency graph.

**Manual release** (skip the auto-detection, bump immediately):

```bash
./scripts/release.sh patch   # or minor / major
```

**Utilities:**

```bash
gh workflow run release.yml -f dry_run=true      # tests only, no publish
gh workflow run release.yml -f tag=v2.1.0        # (re)publish an existing tag
```

## TypeScript Support

Full TypeScript type definitions are included:

```typescript
import { getTokenInteractive, TokenInfo } from 'pixiv-token-getter';

const token: TokenInfo = await getTokenInteractive();
```

## Notes

- ⚠️ **Token Security**: Token files contain sensitive information. The CLI writes them with `0600` permissions; keep them secure and never commit them
- ⚠️ **Timeout**: Interactive login defaults to 5 minutes timeout
- ⚠️ **Headless Login**: May be detected as automation, use interactive login if it fails
- ⚠️ **Browser**: Requires Chromium (Puppeteer will download it automatically)

## Requirements

- Node.js >= 16.0.0
- Puppeteer (Chromium will be downloaded automatically)

## License

MIT

## FAQ

### Q: How do I use this library in my project?

A: Install and import `getTokenInteractive` or `getTokenHeadless`. See [Quick Start](#quick-start).

### Q: What's the difference between interactive and headless login?

A: 
- **Interactive**: Opens browser window, manual login, more stable, recommended
- **Headless**: No UI, automatic login, may be detected as automation

### Q: Do tokens expire?

A: Yes. `access_token` expires (see `expires_in` field), use `refresh_token` to refresh.

### Q: Does it support TypeScript?

A: Yes! Full TypeScript type definitions are included.

## Links

- [Pixiv API Documentation](https://www.pixiv.net/help/article/3629)
- [Puppeteer Documentation](https://pptr.dev/)

For issues, please submit an [Issue](https://github.com/redtidev1918/pixiv-token-getter/issues).
