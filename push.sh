#!/usr/bin/env bash
set -e
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/dylhauck/CW-Czar-Pricing.git
git push -u origin main
echo "Pushed to https://github.com/dylhauck/CW-Czar-Pricing"
