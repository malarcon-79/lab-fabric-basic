#!/bin/bash

export FABRIC_CFG_PATH=$PWD

# Creates cryptographic material
cryptogen generate --config=./crypto-config.yaml

# Genesis block, channel creation TX, anchor update TXs
#configtxgen -profile MainOrgGenesis -outputBlock ./channels/genesis.block -channelID orderer-system-channel
#configtxgen -profile MainOrgChannel -outputCreateChannelTx ./channels/main-channel.tx -channelID main-channel
#configtxgen -profile AllOrgsChannel -outputCreateChannelTx ./channels/allorgs-channel.tx -channelID allorgs-channel

configtxgen -profile MainOrgChannel -outputBlock ./channels/main-channel.tx -channelID main-channel
configtxgen -profile AllOrgsChannel -outputBlock ./channels/allorgs-channel.tx -channelID allorgs-channel

configtxgen -profile AllOrgsChannel -outputAnchorPeersUpdate ./channels/main-channel_anchor_mainorg.tx -channelID main-channel -asOrg MainOrgMSP
configtxgen -profile AllOrgsChannel -outputAnchorPeersUpdate ./channels/allorgs-channel_anchor_mainorg.tx -channelID allorgs-channel -asOrg MainOrgMSP
configtxgen -profile AllOrgsChannel -outputAnchorPeersUpdate ./channels/allorgs-channel_anchor_org1.tx -channelID allorgs-channel -asOrg Org1MSP
configtxgen -profile AllOrgsChannel -outputAnchorPeersUpdate ./channels/allorgs-channel_anchor_org2.tx -channelID allorgs-channel -asOrg Org2MSP
