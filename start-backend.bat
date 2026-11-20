@echo off
title FollowLytics Backend (Spring Boot :8080)
echo Starting FollowLytics Java Backend...
set "JAVA_HOME=C:\Program Files\Java\jdk-21"
cd /d "%~dp0backend"
"C:\apache-maven-3.10.1\bin\mvn.cmd" spring-boot:run
pause
