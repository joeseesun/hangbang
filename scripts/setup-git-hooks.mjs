#!/usr/bin/env node
/**
 * 注册项目内置 git pre-commit 钩子：core.hooksPath -> .githooks。
 * 由 package.json 的 prepare 脚本在 npm install 时调用（此时 git 通常已就绪）。
 * 走原生 git config，无第三方依赖；非 git 环境（CI 构建 / smoke 临时目录）静默跳过，绝不阻断 install。
 */
import { existsSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// 仅当当前目录就是 git 仓库根时才注册，避免污染外层仓库
if (!existsSync('.git') || !existsSync('.githooks/pre-commit')) {
  process.exit(0);
}

try {
  chmodSync('.githooks/pre-commit', 0o755); // 兜底任何丢 +x 的分发链路
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // git 未安装或任何异常：忽略，不阻断 npm install
}
