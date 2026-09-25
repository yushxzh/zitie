# 小字帖

小字帖是一个面向初学写字儿童的静态网站。输入 1～4 个汉字，即可查看每个字的拼音、笔顺动画、逐笔字形和田字格练习；支持手机浏览与打印。

本仓库公开，网站源文件直接放在仓库根目录。运行时不需要后端、数据库或 Node.js。拼音库、笔顺库和字形数据均随网站文件提供。

## 功能

- 每次生成 1～4 个汉字的字帖，每个字独立展示。
- 按笔顺逐步显示字形；已写过的笔画保持相同颜色。
- 提供完整字、浅色描红和空白田字格。
- 自动生成拼音，并允许手动修改多音字读音。
- 支持手机屏幕和打印。

## 目录

| 路径 | 用途 |
| --- | --- |
| `index.html`、`styles.css`、`app.js` | 页面、样式和交互 |
| `vendor/` | 随站点提供的 Hanzi Writer 与 pinyin-pro |
| `data/` | 按汉字拆分的本地笔顺数据 |
| `licenses/` | 第三方资源的许可文件 |
| `robots.txt`、`sitemap.xml` | 搜索引擎抓取规则和首页站点地图 |
| `.github/workflows/build-static-site.yml` | 构建静态网站压缩包并发布 GitHub Release |

## 构建与部署

每次推送到 `main`，GitHub Actions 会检查网站文件，生成 `zitie-static.zip`，并上传到新的 [GitHub Release](https://github.com/yushxzh/zitie/releases/latest)。也可以在 Actions 页面手动运行「构建静态网站压缩包」。Actions 页面中的构建产物保留 30 天；服务器可从最新 Release 下载压缩包，无需安装 GitHub CLI 或登录 GitHub：

```bash
curl -fL https://github.com/yushxzh/zitie/releases/latest/download/zitie-static.zip -o zitie-static.zip
unzip -t zitie-static.zip
```

使用 1Panel 部署时：

1. 从最新 Release 下载 `zitie-static.zip`。
2. 在 1Panel 中创建静态网站，设置域名。
3. 将压缩包解压到网站根目录，确认根目录下直接包含 `index.html`，再配置 DNS 和 HTTPS。

网站无需安装依赖或在服务器上执行构建命令。也可以在仓库根目录运行 `python3 -m http.server 8000` 进行本地预览。

## 搜索引擎收录

部署后检查 `https://zitie.ningboshuyu.com/robots.txt` 和 `https://zitie.ningboshuyu.com/sitemap.xml` 能正常访问。站点地图只列出可独立访问的首页；输入不同汉字生成的内容仍在同一页面内，不会产生新的可收录网址。

可以在 Google Search Console、Bing Webmaster Tools 或百度搜索资源平台验证站点所有权并提交 `sitemap.xml`。提交后可使用各平台的网址检查功能查看抓取与收录状态；站点地图和提交请求都不能保证立即收录。

## 数据与限制

笔顺资料来自 Hanzi Writer Data。缺少笔顺资料的汉字会显示提示；多音字的自动拼音可在页面中修改。第三方许可见 `licenses/`。
