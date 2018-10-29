#!/bin/bash

docker-compose down

echo "Removing old containers, images and volumes"
docker rm $(docker ps -aq)
docker rmi $(docker images "dev*" -q)
docker volume rm $(docker volume ls -q)

#echo "Pulling Docker images"
docker pull hyperledger/fabric-baseos:0.4.14
docker pull hyperledger/fabric-couchdb:0.4.14
docker pull hyperledger/fabric-kafka:0.4.14
docker pull hyperledger/fabric-zookeeper:0.4.14

docker pull hyperledger/fabric-peer:1.3.0
docker pull hyperledger/fabric-orderer:1.3.0
docker pull hyperledger/fabric-ccenv:1.3.0
docker pull hyperledger/fabric-tools:1.3.0
docker pull hyperledger/fabric-ca:1.3.0