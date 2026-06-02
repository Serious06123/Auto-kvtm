#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Set ADB environment
export ANDROID_HOME="$PROJECT_ROOT/bin"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export ADB_SERVER_SOCKET=tcp:127.0.0.1:5038

# Setup adb symlink based on OS for Appium compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
    ln -sf adb-mac bin/platform-tools/adb
    chmod +x bin/platform-tools/adb bin/platform-tools/adb-mac
else
    ln -sf adb-linux bin/platform-tools/adb
    chmod +x bin/platform-tools/adb bin/platform-tools/adb-linux
fi

# Check Java environment
if ! command -v java &> /dev/null; then
    echo "======================================================"
    echo " [LOI] Khong tim thay Java (JDK) tren he thong!"
    echo " Appium yeu cau JDK 11 tro len de chay gia lap."
    echo "======================================================"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "De nghi cai dat qua Homebrew (mo Terminal moi va chay):"
        echo "  brew install openjdk@17"
        echo "  sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"
    else
        echo "De nghi cai dat tren Linux (chay lenh):"
        echo "  sudo apt update && sudo apt install -y default-jdk"
    fi
    echo "======================================================"
    exit 1
fi

export $(cat ./exec/.env | xargs) && clear
if [[ $IS_BUILDED != TRUE ]]; then
    npm ci \
    && npm run release
    clear
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/IS_BUILDED=FALSE/IS_BUILDED=TRUE/g' exec/.env
    else
        sed -i 's/IS_BUILDED=FALSE/IS_BUILDED=TRUE/g' exec/.env
    fi
    echo "build succeeded"
else
    echo "built before"
fi

npm run stop
npm run clear
npm run start

# display monitoring information
npm run monitor