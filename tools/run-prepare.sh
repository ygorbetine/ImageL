#!/bin/bash
# Roda prepare.sh no Windows usando JDK 17 do sistema e Ant portatil em .tools/ (nao altera o sistema).
cd "$(dirname "$0")/.."
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
export JAVA_HOME="${JAVA_HOME:-/c/Program Files/Java/jdk-17}"
export PATH="$JAVA_HOME/bin:$PWD/.tools/apache-ant-1.10.15/bin:$PATH"
bash prepare.sh > /tmp/prepare.log 2>&1
echo "exit=$?" >> /tmp/prepare.log
