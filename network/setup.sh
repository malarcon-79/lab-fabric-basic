#!/bin/bash

curr=$(pwd)

cd ..
cd ./chaincode/src/malarcon.cl/test_golang
go mod vendor

cd $curr
cd ..
cd ./client
npm install
rm -f node_modules/fabric-client/lib/packager/BasePackager.js
cp patch/BasePackager.js node_modules/fabric-client/lib/packager/BasePackager.js

cd $curr

echo "Removing old containers, images and volumes"
docker-compose down

docker rm $(docker ps -aq)
docker rmi $(docker images "dev*" -q)
docker volume rm $(docker volume ls -q)