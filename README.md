# 路则昊同学作业练习 Web 应用

部署地址：
- Pages 临时域名：`https://lzh20260211.pages.dev`
- 自定义域名：`*.5208090.xyz`（在 Cloudflare Pages 项目中绑定）

## 已实现功能（第一版）
- 多学科题库：数学/数学综合/英语/地理
- 题型：选择题、填空题、简答题
- 自动判分 + 错题本复习
- 练习计时（10/20/30 分钟）
- 家长端统计（本机 localStorage）：次数、平均正确率、最近一次成绩
- 开放题“建议评分”（家长参考）
- 手机/平板/电脑自适应

## 本地预览
```bash
python3 -m http.server 8080
# http://localhost:8080
```

## 数据文件
- `data/homework.json`

## 部署
- GitHub push 到 `main` 后，Cloudflare Pages 自动构建发布（Framework: None, Output: `.`）
