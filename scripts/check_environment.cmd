@echo off
echo TrustMedia AI development environment
echo Workspace: %CD%
python --version
node --version
call npm.cmd --version
docker --version
echo Docker daemon status:
docker info --format "{{.ServerVersion}}"
git --version
