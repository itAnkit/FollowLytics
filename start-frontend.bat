@echo off
title FollowLytics Web App (React Vite :5173)
echo Starting FollowLytics Frontend Web App...
cd /d "%~dp0frontend"
call npm.cmd run dev
pause
