#!/usr/bin/env bash
# 退出前执行所有命令
set -o errexit

pip install -r requirement.txt

cd wolfBackend
python manage.py collectstatic --no-input
python manage.py migrate