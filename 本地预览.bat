@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/3] 安装或检查构建依赖...
python -m pip install -r scripts\requirements.txt
if errorlevel 1 goto error
echo [2/3] 生成静态产品目录...
python scripts\build_catalog.py
if errorlevel 1 goto error
echo [3/3] 浏览器将打开 http://127.0.0.1:8000/
start "" http://127.0.0.1:8000/
python -m http.server 8000 --directory _site
goto end
:error
echo.
echo 构建失败，请查看上方错误信息。
pause
:end
