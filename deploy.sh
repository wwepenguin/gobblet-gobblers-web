#!/usr/bin/env sh

# 發生錯誤時終止腳本
set -e

# 構建
npm run build

# 進入構建文件夾
cd dist

# 如果你要部署到自定義域名
# echo 'www.example.com' > CNAME

# 初始化 git 並提交修改
git init
git add -A
git commit -m 'deploy'

# 如果你要部署在 https://<USERNAME>.github.io
# git push -f git@github.com:<USERNAME>/<USERNAME>.github.io.git main

# 如果你要部署在 https://<USERNAME>.github.io/<REPO>
git push -f git@github.com:wwepenguin/gobblet-gobblers-web.git main:gh-pages

cd - 