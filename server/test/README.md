# 测试设计与构造方法

这份文档解释这套测试为什么这么写、怎么读、怎么加。

## 大思路

```
        e2e simulation (scripts/simulate.mjs)     ← 手动验证，输出彩色
        ────────────────────────────────────────
              game.test.js                         ← 集成（GameSession + Room + engine）
        ────────────────────────────────────────
        engine.test.js   rooms.test.js   auth.test.js   ← 单元（纯函数 / Room 类 / auth）
```

底层尽量是**纯函数测试**（输入 → 输出），上层用**真实组件 + 假外设**（Room 真用，但 io 是 mock）做集成。
顶端有一个**人工跑、彩色输出**的剧情化模拟脚本，用于改动核心规则后肉眼检查。

总测试数：**61**（59 自动通过 + 2 自动跳过，跳过的依赖 Postgres / 可选 deps）。

## 工具选型

用 **Node 自带的 `node --test`**（Node 18+），不引第三方测试框架。理由：

1. 一个 server 子项目不值得引 jest / vitest 那套规模
2. CI 上零额外依赖、零额外构建步骤
3. 输出是 TAP 格式，跟 Render / Vercel / GitHub Actions 都兼容

API 也就这几个：
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('描述', () => { assert.equal(a, b); });
test('需要时跳过', { skip: !condition }, async () => { ... });
```

## 四个测试文件覆盖什么

### `engine.test.js` —— 23 个用例 · 纯函数引擎

测的全是 `src/engine.js` 里的导出函数，**没有任何副作用**，每个测试独立。

| 测什么 | 怎么测 |
|---|---|
| `generateRoomCode` 永远返回 4 位数字 | 跑 50 次断言正则 `/^\d{4}$/` |
| `dealCards` 玩家牌 + 中央牌数量匹配、配置守恒 | 给定配置，断言总数 = 玩家+3，每种角色出现次数等于配置 |
| `dealCards` 牌不够时抛错 | `assert.throws(() => dealCards({wolf:1}, 4))` |
| `generateNightSteps` 单狼附带独狼查中央 | 输入 `['werewolf', ...]`，断言 `lone_wolf_peek` 在 |
| `generateNightSteps` 步骤顺序 | 输入"全开"角色数组，断言 kind 序列 |
| `generateNightSteps` 无夜晚行动角色返回空 | 输入全村民/猎人/皮匠，断言长度 0 |
| `resolveKilled` 1 票不淘汰 | 每人 1 票，期望 `killed=[]` |
| `resolveKilled` 2 票淘汰 | 玩家收 2 票，期望 `killed=[那个 idx]` |
| `resolveKilled` 平票全部淘汰 | 两人各 2 票，期望 `killed=[a, b]` |
| `resolveKilled` 猎人连带 | 猎人投狼，狼也被多人投，构造猎人 + 狼一起死 |
| `determineWinners` 8 种胜负组合 | 表格驱动：是否有狼/狼死/皮匠死的组合 |
| `validateConfig` 合法/不合法 | 各种边界值 |

**设计原则：每个测试只测 1 个性质**，名字写清楚。失败时一眼能定位。

### `rooms.test.js` —— 19 个用例 · Room 类

测 `src/rooms.js`，主要难点是**异步的 grace timer**。

| 关键技巧 | 例子 |
|---|---|
| 缩短超时再 `setTimeout` 验证 | `r.scheduleRemoval(id, 30, cb); await sleep(80); 断言 cb 触发` |
| 用回调被调用次数判断 | `let fired = false; ... ; assert.equal(fired, true)` |
| 验证负向行为：取消后 sleep 等待 | 取消 → sleep 80ms → 断言 `fired === false` |
| 多个 timer 并发 | `cancelAllRemovals()` 应该一次全清 |

特别覆盖**4 种状态转移**：
1. 调度 → 取消 → 不触发
2. 调度 → 到期 → 触发 + 玩家被移除 + host 转给下一位
3. 调度 → 进入 night 阶段 → 触发但不踢人（因为已经游戏中）
4. 调度 → 玩家重新上线 → 取消，玩家保留

也测了 `toPublicState` 在 lobby / night / day / vote / result 五种 phase 下输出的差异（特别是 `dayEndsAt`、`voteProgress`、`result` 字段的存在/缺失）。

### `game.test.js` —— 17 个用例 · GameSession 集成

`GameSession` 跟 Room、engine、io 都耦合，但 io 是 socket.io 对象，测不了。
**用 mock io 把所有 emit 抓住**：

```js
function makeMockIO() {
  const log = [];
  return {
    io: {
      to(target) {
        return {
          emit(event, payload) { log.push({ target, event, payload }); }
        };
      },
    },
    log,
  };
}
```

然后用一个 `setupRoom(roleArr)` helper **手动注入角色**绕过随机洗牌：

```js
function setupRoom(roleArr) {
  const { io, log } = makeMockIO();
  const room = new Room('1234');
  roleArr.forEach((_, i) => room.addPlayer(`P${i+1}`));
  const game = new GameSession(room, io);
  game.initialRoles = [...roleArr];          // 跳过 shuffle
  game.initialCenter = ['villager','villager','villager'];
  game.currentRoles = [...roleArr];
  game.currentCenter = [...game.initialCenter];
  game.nightSteps = game.computeNightSteps();
  return { room, game, io, log };
}
```

这是测试**确定性**的关键 —— 没有 setupRoom 这层 helper，每个测试都得自己拼一遍且依赖随机数。

测试用例分布：

- 化身幽灵（3）：复制狼人后 currentRoles 更新 + 重生成步骤；复制村民只阵营对齐；步骤合并正确
- 强盗（2）：互换 OK；拒绝自偷
- 捣蛋鬼（2）：互换 OK；不能包含自己
- 酒鬼（1）：与中央底牌交换
- 预言家（3）：查玩家版；查中央 2 张；拒绝重复底牌
- 独狼查中央（1）：返回正确角色
- 流程（5）：handleDone 集齐推进、投票累加、平 vote 拒绝、改投覆盖等

**断言策略**：直接读 `game.currentRoles` 等内部状态。这是白盒测试，因为协议层（emit）已经在自己代码里检查过了，这里没必要再绕一圈。

### `auth.test.js` —— 2 个用例 · 用户系统（条件 skip）

特殊处理：**整个 suite 在依赖缺失时自动 skip**：

```js
let authModule = null;
try {
  authModule = await import('../src/auth.js');
} catch (e) { /* 缺 bcryptjs / jwt */ }

const DEPS_OK = !!authModule;
const HAS_DB  = DEPS_OK && !!process.env.DATABASE_URL;

test('verifyToken 拒绝乱码', { skip: !DEPS_OK }, () => { ... });
test('完整账号链路',          { skip: !HAS_DB }, async () => { ... });
```

为什么这样：
- `auth.js` 静态 import 了 `bcryptjs / jsonwebtoken`，没装会直接挂模块加载
- 用动态 import + try/catch 包裹，缺依赖就把整个 suite 标 skip
- 完整账号链路还需要 Postgres，多套一层 `HAS_DB`

跑法：
```
npm test                          # auth 全部 skip
npm install                       # 之后 verifyToken 测试能跑
DATABASE_URL=... npm test         # 之后完整链路也能跑
```

## 一个关键重构：让 `game.js` 不强依赖 `auth.js`

原本 `game.js` 顶部 `import { saveGameRecord } from './auth.js'`，结果 game.test.js 也连带要 bcryptjs。
改成**运行时动态 import**：

```js
async function trySaveGameRecord(payload) {
  try {
    const { saveGameRecord } = await import('./auth.js');
    await saveGameRecord(payload);
  } catch (e) {
    if (e?.code !== 'ERR_MODULE_NOT_FOUND') {
      console.error('[wolf] save game record failed', e);
    }
  }
}
```

好处：
1. game.test.js 不需要任何用户系统依赖
2. 不配 DATABASE_URL 时整个游戏完整可用（保存这一步静默 noop）
3. 把"账号是可选模块"的设计原则在代码层面落实了

## 另一个关键修：周期任务用 `.unref()`

`rooms.js` 里清理空房间的 `setInterval`，原本会**阻止 Node 进程退出**。测试跑完 timer 还在，进程挂在那儿等。

```js
setInterval(() => { ... }, 5 * 60 * 1000).unref();
```

`.unref()` 告诉 Node "这个定时器在事件循环里可以被忽略"。生产环境跟 socket.io 一起的事件循环本来就活着，这个 unref 不影响清理；测试时只剩这个 timer，进程能正常退出。

**经验：长跑的 setInterval / setTimeout 都该考虑 unref()**。

## 加新测试的套路

1. **纯函数**：直接 `test('xxx', () => assert.deepEqual(fn(...), expected))`
2. **Room 类**：`new Room(); 操作; 断言内部状态`
3. **GameSession**：用 `setupRoom()` helper 跳过随机；手动设 `game.stepIndex`；调 `handleAction`；读 `privateLog` 或 `currentRoles` 断言
4. **异步**：`async () => { ... await sleep(80); ... }`；记得 timer 用 30-50ms 避免太慢
5. **私密事件**：测试前清 `game.room.players[idx].privateLog = []`，操作完用 `.pop()` 拿到最后那条

## 端到端模拟脚本

`scripts/simulate.mjs` 不在 `npm test` 里跑（输出太多 / 主要为人眼检查）。
它跑 6 个剧情化场景，**带颜色输出**：

- 场景 1：4 人局完整一夜流程
- 场景 2：化身复制狼，验证步骤合并、独狼查中央自动取消
- 场景 3：单狼真的能查中央底牌
- 场景 4：猎人连带带走目标
- 场景 5：皮匠单独胜利
- 场景 6：全角色 8 人局步骤顺序

任何引擎改动后跑一次：

```
cd server
node scripts/simulate.mjs
```

## 已知盲点

按"重要程度低 → 高"排序：

1. **没有覆盖 socket.js 的事件分发**：靠手动测玩游戏来验证。socket.js 主要是把 socket 事件翻译成 Room/Game 调用，逻辑薄。
2. **没有覆盖前端**：app/ 没有任何测试。前端是 React 视图层，逻辑都在服务端，写起来收益低。
3. **没有压力测试**：单进程能扛多少并发房间？没测过。游戏房间 ≤10 人 + 内存小 + 状态机不复杂，估计单 Render 免费层扛几百房间没问题。
4. **没有覆盖大厅 edge case 的并发**：例如两个玩家同时进同一房间、同时改昵称，理论上 Node 单线程 race 不会出，但没断言过。

要补的话我们再说。
