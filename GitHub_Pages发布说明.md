# GitHub Pages 发布说明

GitHub 用户名：`1402540578`  
仓库名称：`haihong-product-catalog`

## 一、替换仓库文件

你之前的仓库可能已经上传过 Python/Render 版本。建议先下载仓库备份，然后将本压缩包内的全部内容上传到仓库根目录。

仓库首页应直接看到：

```text
.github
import
scripts
site
README.md
本地预览.bat
```

不要在仓库外面再多套一层文件夹。

## 二、设置仓库可见性

使用 GitHub Free 时，最简单的方式是把仓库设置为 `Public`：

```text
Settings → General → Danger Zone → Change repository visibility → Public
```

产品目录网页会公开访问，所以仓库中不要存放成本、供应商、利润、客户隐私或密码。

## 三、启用 GitHub Pages

进入仓库后依次点击：

```text
Settings
→ Pages
→ Build and deployment
→ Source
→ GitHub Actions
```

本项目已经包含 `.github/workflows/pages.yml`，不用再选择 GitHub 提供的模板。

## 四、启动第一次发布

上传文件并提交后，进入：

```text
Actions
→ 构建并发布产品目录
```

等待两个任务变为绿色：

```text
build

deploy
```

如果工作流没有自动运行，可以点击：

```text
Run workflow
→ Run workflow
```

## 五、打开网站

发布成功后访问：

```text
https://1402540578.github.io/haihong-product-catalog/
```

也可以在仓库首页右侧的 `Deployments` 或 `Environments` 中点击 `github-pages` 查看实际网址。

## 六、日常更新

### 更新产品信息

```text
进入 import
→ 打开 products.xlsx
→ Download
→ 修改后上传覆盖
→ Commit changes
```

### 上传产品图片

```text
进入 import/images
→ Add file
→ Upload files
→ 选择多张图片
→ Commit changes
```

图片建议以产品编码命名，例如：

```text
01ED-1070.jpg
01ED-1070_主图.png
```

图片很多时，可以上传 `import/images.zip`。

### 按系列批量上下架

修改：

```text
import/series-status.csv
```

填写产品系列和 `active`/`inactive`，提交后自动执行。

## 七、下载失败明细

```text
Actions
→ 构建并发布产品目录
→ 选择本次运行
→ 页面底部 Artifacts
→ 下载 import-reports
```

## 八、添加产品维护人员

```text
Settings
→ Collaborators
→ Add people
```

建议：

- 你本人保留 Admin 权限
- 产品维护人员给予 Write 权限
- 仅需查看仓库的人给予 Read 权限
- 销售不加入仓库，只访问产品目录网址

建议在 `Settings → Rules → Rulesets` 中保护 `main` 分支，要求通过 Pull Request 审核后才能发布。
