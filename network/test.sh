#!/bin/bash

echo "Creating channels using osnadmin"
OSN_TLS_CA_ROOT_CERT=./devchannel/crypto-config/peerOrganizations/main.org.com/tlsca/tlsca.main.org.com-cert.pem
ADMIN_TLS_SIGN_CERT=./devchannel/crypto-config/peerOrganizations/main.org.com/users/Admin@main.org.com/tls/client.crt
ADMIN_TLS_PRIVATE_KEY=./devchannel/crypto-config/peerOrganizations/main.org.com/users/Admin@main.org.com/tls/client.key

#ORDERER_ADMIN_LISTENADDRESS=localhost:9443
#../client/tools/osnadmin channel list -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY

ORDERER_ADMIN_LISTENADDRESS=localhost:9443
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID main-channel --config-block ./devchannel/channels/main-channel.tx
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID allorgs-channel --config-block ./devchannel/channels/allorgs-channel.tx

ORDERER_ADMIN_LISTENADDRESS=localhost:9543
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID main-channel --config-block ./devchannel/channels/main-channel.tx
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID allorgs-channel --config-block ./devchannel/channels/allorgs-channel.tx

OSN_TLS_CA_ROOT_CERT=./devchannel/crypto-config/peerOrganizations/org1.org.com/tlsca/tlsca.org1.org.com-cert.pem
ADMIN_TLS_SIGN_CERT=./devchannel/crypto-config/peerOrganizations/org1.org.com/users/Admin@org1.org.com/tls/client.crt
ADMIN_TLS_PRIVATE_KEY=./devchannel/crypto-config/peerOrganizations/org1.org.com/users/Admin@org1.org.com/tls/client.key
ORDERER_ADMIN_LISTENADDRESS=localhost:10443
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID allorgs-channel --config-block ./devchannel/channels/allorgs-channel.tx

OSN_TLS_CA_ROOT_CERT=./devchannel/crypto-config/peerOrganizations/org2.org.com/tlsca/tlsca.org2.org.com-cert.pem
ADMIN_TLS_SIGN_CERT=./devchannel/crypto-config/peerOrganizations/org2.org.com/users/Admin@org2.org.com/tls/client.crt
ADMIN_TLS_PRIVATE_KEY=./devchannel/crypto-config/peerOrganizations/org2.org.com/users/Admin@org2.org.com/tls/client.key
ORDERER_ADMIN_LISTENADDRESS=localhost:11443
../client/tools/osnadmin channel join -o $ORDERER_ADMIN_LISTENADDRESS --ca-file $OSN_TLS_CA_ROOT_CERT --client-cert $ADMIN_TLS_SIGN_CERT --client-key $ADMIN_TLS_PRIVATE_KEY --channelID allorgs-channel --config-block ./devchannel/channels/allorgs-channel.tx

echo "Joining Peers to Channels"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="MainOrgMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=./devchannel/crypto-config/peerOrganizations/main.org.com/peers/peer0.main.org.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=./devchannel/crypto-config/peerOrganizations/main.org.com/users/Admin@main.org.com/msp
export CORE_PEER_ADDRESS=localhost:7051
../client/tools/peer channel join -b ./devchannel/channels/main-channel.tx
../client/tools/peer channel join -b ./devchannel/channels/allorgs-channel.tx

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=./devchannel/crypto-config/peerOrganizations/org1.org.com/peers/peer0.org1.org.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=./devchannel/crypto-config/peerOrganizations/org1.org.com/users/Admin@org1.org.com/msp
export CORE_PEER_ADDRESS=localhost:8051
../client/tools/peer channel join -b ./devchannel/channels/allorgs-channel.tx

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=./devchannel/crypto-config/peerOrganizations/org2.org.com/peers/peer0.org2.org.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=./devchannel/crypto-config/peerOrganizations/org2.org.com/users/Admin@org2.org.com/msp
export CORE_PEER_ADDRESS=localhost:9051
../client/tools/peer channel join -b ./devchannel/channels/allorgs-channel.tx

echo "Installing smartcontracts"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="MainOrgMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=./devchannel/crypto-config/peerOrganizations/main.org.com/peers/peer0.main.org.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=./devchannel/crypto-config/peerOrganizations/main.org.com/users/Admin@main.org.com/msp
export CORE_PEER_ADDRESS=localhost:7051
echo "Package step"
../client/tools/peer lifecycle chaincode package test_golang.tar.gz --lang golang --path ../chaincode/src/malarcon.cl/test_golang --label test_golang
echo "Install step"
../client/tools/peer lifecycle chaincode install test_golang.tar.gz #--peerAddresses $CORE_PEER_ADDRESS --tlsRootCertFiles $CORE_PEER_TLS_ROOTCERT_FILE

#../client/tools/peer lifecycle chaincode queryinstalled --output json
CC_PACKAGE_ID=$(../client/tools/peer lifecycle chaincode calculatepackageid test_golang.tar.gz --output json | jq '.package_id')
OSN_TLS_CA_ROOT_CERT=./devchannel/crypto-config/peerOrganizations/main.org.com/tlsca/tlsca.main.org.com-cert.pem

echo "Approve step"
../client/tools/peer lifecycle chaincode approveformyorg --orderer localhost:7050 --channelID main-channel --name test_golang --version 1.0.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile $OSN_TLS_CA_ROOT_CERT --init-required --signature-policy "OR ('MainOrgMSP.peer')"

echo "Check step"
../client/tools/peer lifecycle chaincode checkcommitreadiness -o localhost:7050 --channelID main-channel --name test_golang --version 1.0.0 --tls --cafile $OSN_TLS_CA_ROOT_CERT --init-required --sequence 1 --output json

echo "Commit step"
../client/tools/peer lifecycle chaincode commit -o localhost:7050 --channelID main-channel --name test_golang --version 1.0.0 --sequence 1 --init-required --tls --cafile $OSN_TLS_CA_ROOT_CERT #--peerAddresses <PEER_ADDRESS> --tlsRootCertFiles <TLS_ROOT_CERT_FILES>