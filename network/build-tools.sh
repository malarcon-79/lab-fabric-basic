#!/bin/bash

curr=$(pwd)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd $SCRIPT_DIR

cd ..
mkdir -p client/tools

docker run -it --rm -v $(pwd)/client/tools:/workspace/tools -w /workspace golang:latest /bin/bash -c "git clone https://github.com/hyperledger/fabric.git;
cd /workspace/fabric;
make osnadmin peer;
cp /workspace/fabric/build/bin/* /workspace/tools"

cd $curr
