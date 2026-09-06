# Pixiv Token Getter

> 一个使用 Puppeteer 获取 Pixiv 登录 Token 的 Node.js 库和 CLI 工具。易于集成到您的项目中。

**简称：** `ptg`（CLI 命令别名）

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[中文](./README.zh-CN.md) | [English](./README.md)

## 特性

- ✅ **易于集成** - 简洁的 API，方便集成
- ✅ **两种登录模式** - 交互式和无头登录
- ✅ **持久化浏览器 profile** - 浏览器资料缓存于 `~/.config/pixiv-token-getter/profile`，首次登录后后续运行通常免登录；API 传 `userDataDir: ''` 可强制使用全新临时 profile
- ✅ **顺带抓取网页 Cookie** - 登录成功后额外返回 Pixiv 网页会话 cookie（如 `PHPSESSID`）于 `web_cookies`，供网页抓取复用
- ✅ **TypeScript 支持** - 完整的 TypeScript 类型定义
- ✅ **CLI 工具** - 命令行界面
- ✅ **灵活配置** - 可自定义超时、回调等

## 安装

```bash
npm install pixiv-token-getter
```

## 快速开始

### 作为库使用

#### 交互式登录（推荐）

```javascript
const { getTokenInteractive } = require('pixiv-token-getter');

async function main() {
  try {
    const token = await getTokenInteractive({
      onBrowserOpen: () => {
        console.log('浏览器已打开，请完成登录');
      },
    });

    console.log('访问令牌:', token.access_token);
    console.log('用户:', token.user.name);
  } catch (error) {
    console.error('登录失败:', error.message);
  }
}

main();
```

#### 无头登录

```javascript
const { getTokenHeadless } = require('pixiv-token-getter');

async function main() {
  try {
    const token = await getTokenHeadless({
      username: 'your_username',
      password: 'your_password',
    });

    console.log('访问令牌:', token.access_token);
  } catch (error) {
    console.error('登录失败:', error.message);
  }
}

main();
```

#### ES6 模块导入

```javascript
import { getTokenInteractive, getTokenHeadless } from 'pixiv-token-getter';

const token = await getTokenInteractive();
```

### 作为 CLI 工具使用

安装后，您可以使用 `ptg`（简短别名）或 `pixiv-token-getter` 命令：

#### 交互式登录

```bash
npm start
# 或
node cli.js --interactive
# 或（如果全局安装）
ptg --interactive
# 或
pixiv-token-getter --interactive
```

#### 无头登录

```bash
node cli.js --headless username password
# 或（如果全局安装）
ptg --headless username password
```

#### 指定输出文件

```bash
node cli.js --interactive --output=my-token.json
# 或（如果全局安装）
ptg --interactive --output=my-token.json
```

## API 文档

### `getTokenInteractive(options?)`

通过交互式登录获取令牌。

**参数：**

- `options` (可选):
  - `headless` (boolean): 使用无头模式，默认 `false`
  - `timeout` (number): 超时时间（毫秒），默认 `300000` (5 分钟)
  - `onBrowserOpen` (function): 浏览器打开时的回调函数
  - `onPageReady` (function): 页面准备就绪时的回调函数

**返回：** `Promise<TokenInfo>`

**示例：**

```javascript
const token = await getTokenInteractive({
  timeout: 600000,
  onBrowserOpen: (browser) => {
    console.log('浏览器已打开');
  },
  onPageReady: (page, url) => {
    console.log('登录页面:', url);
  },
});
```

### `getTokenHeadless(options)`

通过无头登录获取令牌（用户名/密码）。

**参数：**

- `options` (必需):
  - `username` (string): 用户名
  - `password` (string): 密码
  - `timeout` (number, 可选): 超时时间（毫秒），默认 `120000` (2 分钟)

**返回：** `Promise<TokenInfo>`

**示例：**

```javascript
const token = await getTokenHeadless({
  username: 'your_username',
  password: 'your_password',
  timeout: 300000,
});
```

### `TokenInfo` 类型

```typescript
interface TokenInfo {
  access_token: string;      // 访问令牌
  refresh_token: string;     // 刷新令牌
  expires_in: number;        // 过期时间（秒）
  token_type: string;        // 令牌类型（通常是 'bearer'）
  scope: string;             // 权限范围
  user: {                    // 用户信息
    id: string;
    name: string;
    account: string;
  };
}
```

## 示例

### 保存令牌到配置文件

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
  console.log('令牌已保存');
}

saveToken();
```

### 在 Express 应用中使用

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

### 使用令牌调用 Pixiv API

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
  console.log('获取到', illusts.length, '个推荐插画');
});
```

更多示例请查看 [examples](./examples/) 目录。

## CLI 选项

使用 `ptg` 或 `pixiv-token-getter` 命令（如果全局安装）：

- `--interactive` - 交互式登录模式（默认）
- `--headless [username] [password]` - 无头登录模式
- `--output=<file>` - 输出文件路径（默认：`pixiv-token.json`）
- `--version`, `-v` - 显示版本
- `--help`, `-h` - 显示帮助信息

**环境变量：** 无头模式下可以通过环境变量提供凭据，避免密码进入 shell 历史：

```bash
PIXIV_USERNAME=your_username PIXIV_PASSWORD=your_password ptg --headless
```

**CLI 别名：** 命令也可以使用 `ptg`（Pixiv Token Getter 的简称）以便使用。

## 发布新版本

发版完全自动化——按 [Conventional Commits](https://www.conventionalcommits.org/zh-Hans/) 规范提交并推送到 `main` 即可。CI（[release.yml](./.github/workflows/release.yml)）会分析自上个标签以来的提交并自动决定：

| 距上个标签的提交类型                        | 版本级别 | 示例                        |
| -------------------------------------- | -------- | --------------------------- |
| `feat!` / `fix!` / `BREAKING CHANGE:`      | major    | `feat!: 全新 API`           |
| `feat`                                  | minor    | `feat(cli): 新增 --json 参数` |
| `fix` / `perf` / `revert`                | patch    | `fix: 修正 token 地址`       |
| 仅 `docs` / `chore` / `ci` / `test` 等     | 不发版   | 不产生新版本                 |

需要发版时自动执行：在仍受支持的 Node 22/24 上测试 → 升版本号 + 打标签 → 通过**可信发布**（OIDC，无需任何 token secret，附带 provenance）发布到 npm → 自动生成变更日志并创建 GitHub Release。仓库提交 `package-lock.json`，让 CI 与本地安装使用同一套依赖图。

**手动发版**（跳过自动判断，立即升版）：

```bash
./scripts/release.sh patch   # 或 minor / major
```

**其他操作：**

```bash
gh workflow run release.yml -f dry_run=true      # 仅跑测试，不发布
gh workflow run release.yml -f tag=v2.1.0        # 补发/重发已有标签
```

## TypeScript 支持

包含完整的 TypeScript 类型定义：

```typescript
import { getTokenInteractive, TokenInfo } from 'pixiv-token-getter';

const token: TokenInfo = await getTokenInteractive();
```

## 注意事项

- ⚠️ **令牌安全**：令牌文件包含敏感信息。CLI 会以 `0600` 权限写入令牌文件，请妥善保管，切勿提交到版本库
- ⚠️ **超时设置**：交互式登录默认超时时间为 5 分钟
- ⚠️ **无头登录**：可能被检测为自动化行为，如果失败请使用交互式登录
- ⚠️ **浏览器**：需要 Chromium（Puppeteer 会自动下载）

## 要求

- Node.js >= 16.0.0
- Puppeteer（Chromium 会自动下载）

## 许可证

MIT

## 常见问题

### Q: 如何在项目中使用这个库？

A: 安装并导入 `getTokenInteractive` 或 `getTokenHeadless`。请参阅[快速开始](#快速开始)。

### Q: 交互式登录和无头登录有什么区别？

A: 
- **交互式**：打开浏览器窗口，手动登录，更稳定，推荐使用
- **无头**：无界面，自动登录，可能被检测为自动化

### Q: 令牌会过期吗？

A: 是的。`access_token` 会过期（查看 `expires_in` 字段），使用 `refresh_token` 可以刷新。

### Q: 支持 TypeScript 吗？

A: 支持！包含完整的 TypeScript 类型定义。

## 相关链接

- [Pixiv API 文档](https://www.pixiv.net/help/article/3629)
- [Puppeteer 文档](https://pptr.dev/)

如有问题，请提交 [Issue](https://github.com/redtidev1918/pixiv-token-getter/issues)。
