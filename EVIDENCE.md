# T-20260211-100 审查证据包（学习计划版）

对应版本：`HEAD`（请以仓库最新 commit 为准）
仓库：`https://github.com/ldj518/lzh20260211` 分支：`main`

## 1) 新需求能力映射（页面/数据结构/结果）

| 能力 | 页面入口 | 数据结构 | 结果 |
|---|---|---|---|
| 计划生成（20/30天） | 首页「生成学习计划」 | `localStorage.plan_v3`：`{days,cap,strategy,plan[]}` | 生成 Day1..DayN，每天 cap 项任务 |
| 每日任务状态 | 今日任务列表 checkbox | `plan[].tasks[].done` | 勾选后状态持久化，家长统计同步变化 |
| 拍照提交 | 「拍照提交」区 | `localStorage.photo_v3[]`：`{day,img,note,time}` | 提交后卡片墙显示图片+时间戳 |
| 家长端查看 | 「家长端统计」区 | 从 `plan_v3/photo_v3/time_v3` 汇总 | 显示总完成率、学科完成数、学科累计时长 |
| 作业计时/统计 | 计时科目 + 开始/暂停/继续/结束 | `localStorage.time_v3`：`{subject:ms}` | 单次计时结束后累计到科目总时长 |

## 2) 学习计划生成规则（可复现）

### 规则说明
1. 数据源：`data/homework.json`。
2. 稳定排序：按 `subject + id` 排序（无随机）。
3. 总任务槽位：`days * cap`。
4. 分配策略：按排序后的任务循环填充（stable-round-robin）。
5. 20/30切换：仅改变 `days`，`cap` 不变时总量线性变化。
6. 未完成顺延：Day d 展示时，会先拉取 Day1..Day(d-1) 未完成任务，标记 `carryOver=true`，再补当日任务，最终截断到 `cap`。

### 示例输出A（days=20, cap=3）
- 总槽位：60
- Day1: `数学(m1)` `数学(m2)` `数学(m3)`
- Day2: `数学(m4)` `数学(m5)` `数学(m6)`
- Day3: `数学(m7)` `数学(m8)` `数学(m9)`

### 示例输出B（days=30, cap=4）
- 总槽位：120
- Day1: `数学(m1)` `数学(m2)` `数学(m3)` `数学(m4)`
- Day2: `数学(m5)` `数学(m6)` `数学(m7)` `数学(m8)`
- Day3: `数学(m9)` `数学综合(s1)` `数学综合(s2)` `数学综合(s3)`

> 同一输入（同题库、days、cap）输出稳定一致，可复现。

## 3) 拍照提交端到端证据（入口-操作-结果）
1. 入口：页面「拍照提交」区。
2. 操作：拍照/选图 → 填备注 → 点「保存打卡」。
3. 校验：
   - 仅 `image/*`；
   - 大小 ≤ 5MB；
   - FileReader 失败自动重试1次（`readFileWithRetry`）。
4. 存储：写入 `photo_v3`，字段含 `day/time/note/img(dataURL)`。
5. 结果：`photo-wall` 立即展示记录，家长端可见时间戳。

## 4) 计时与统计口径
- 开始：`start` 进入 running，记录 `startAt`。
- 暂停：`pause` 将 `Date.now()-startAt` 累加到 `accMs`。
- 继续：`resume` 恢复 running，不丢失 `accMs`。
- 结束：`stop` 将本次 `accMs` 累加到 `time_v3[subject]`。

统计口径：
- 单次时长：本次 `accMs`。
- 科目累计：`time_v3[subject]` 总和。
- 每日总量：通过当日任务勾选完成数 + 科目累计时长展示（前台家长端）。

## 5) 隐私与合规
- 姓名展示：`路*昊同学`（已脱敏）。
- 原题图策略：仓库不提交原题图，仅保留结构化数据。
- 检索命令：
```bash
grep -R --line-number --exclude-dir=.git '路则昊' .
grep -R --line-number --exclude-dir=.git '路\*昊' .
```
