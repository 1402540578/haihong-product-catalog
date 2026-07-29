# 海宏产品目录｜GitHub-only 版本

本项目将海宏产品目录改造成完全运行在 **GitHub Pages + GitHub Actions** 上的静态网站，不需要 Render、云服务器或本地长期运行 Python。

## 访问地址

仓库发布成功后，默认网址为：

```text
https://1402540578.github.io/haihong-product-catalog/
```

## 项目能力

- 保留“海宏产品目录_前台LOGO重新调整版”的前台设计
- 电脑、平板、手机自适应
- Excel 批量新增、修改和上下架产品
- 批量导入 JPG、PNG、WEBP 产品图片
- 支持上传 `images.zip` 图片压缩包
- 按产品系列批量上架、下架
- 自动生成导入失败明细
- GitHub 提交记录作为操作日志
- GitHub 仓库协作者作为多账号权限体系
- 每次提交后自动构建和发布网站

## 目录说明

```text
site/                       前台网页源文件
import/products.xlsx        产品信息主数据
import/images/              批量产品图片
import/images.zip           可选的图片压缩包
import/series-status.csv    按系列批量上下架规则
scripts/build_catalog.py    自动构建程序
reports/                    本地构建报告
.github/workflows/pages.yml GitHub Pages 自动发布流程
_site/                      构建结果，本地生成，不需要上传
```

## 日常维护产品信息

1. 下载仓库中的 `import/products.xlsx`。
2. 在“产品数据”工作表中新增或修改产品。
3. `上架状态`填写：
   - `active`：上架
   - `inactive`：下架
4. 将修改后的文件上传回 `import/products.xlsx`，覆盖旧文件。
5. 提交后 GitHub Actions 会自动更新网站。

系统以 Excel 为产品信息的主要来源。产品编码不能为空。

## 批量导入产品图片

将图片上传到：

```text
import/images/
```

推荐命名：

```text
01ED-1070.jpg
01ED-1070_主图.png
02TC-1058.webp
```

也可以把所有图片压缩成：

```text
import/images.zip
```

系统会根据文件名中的产品编码自动匹配。图片支持 JPG、PNG、WEBP，单张不超过 8MB。

## 按系列批量上下架

编辑：

```text
import/series-status.csv
```

示例：

```csv
产品系列,操作
质感针织绒,inactive
科技皮革&面料,active
```

该文件中的规则会覆盖 Excel 中对应系列的单品状态。操作完成后可清空规则，只保留表头，避免下一次继续覆盖。

## 查看导入失败明细

进入仓库：

```text
Actions → 构建并发布产品目录 → 最近一次运行
```

在页面底部的 `Artifacts` 下载：

```text
import-reports
```

其中包含：

```text
import-errors.csv
build-summary.json
```

## 操作日志和账号权限

GitHub-only 版本不再设置网页后台账号：

- 仓库所有者或 Admin：超级管理员
- Write/Maintain 协作者：产品管理员
- Read 协作者：只读人员
- 销售：直接访问 GitHub Pages，不需要 GitHub 账号

操作记录由以下内容组成：

- Git 提交历史：谁、何时、修改了哪些文件
- 文件差异：修改前后内容
- Actions 运行记录：构建与发布是否成功
- Pages 部署记录：每次上线版本

建议开启 `main` 分支保护，要求产品维护人员通过 Pull Request 提交，由管理员审核后合并发布。

## 本地预览

Windows 双击：

```text
本地预览.bat
```

macOS/Linux：

```bash
./本地预览.sh
```

然后打开：

```text
http://127.0.0.1:8000/
```

## 安全提醒

GitHub Pages 网站是静态公开网页。请勿在 Excel、JSON、网页或仓库中放入成本、利润率、供应商机密、客户隐私、密码或其他敏感资料。
