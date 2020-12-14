#!/bin/bash

echo "Starting Fabric-tools TTY..."
echo "Use CTRL+D to exit the shell"

FABRIC_VERSION=${1:-"2.3"}

echo "Running tools version: " $FABRIC_VERSION

docker run -it \
--workdir /opt/gopath/src/github.com/hyperledger/fabric/config \
--mount type=bind,src=/var/run,dst=/host/var/run \
--mount type=bind,src="$PWD",dst=/opt/gopath/src/github.com/hyperledger/fabric/config \
-e "FABRIC_CFG_PATH=/opt/gopath/src/github.com/hyperledger/fabric/config" \
hyperledger/fabric-tools:$FABRIC_VERSION \
/bin/bash
