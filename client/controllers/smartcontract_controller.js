/**
 * @author Marco Alarcón
 * @description Admin SmartContracts controller
 */

'use strict';

const model = require('../models/admin_smartcontract');
const logger = require('winston');

exports.invoke = async (req, res) => {
	logger.info('<<<<<<<<<<<<<<<<< INVOKE SC >>>>>>>>>>>>>>>>>');
	const ccparams = req.body;
	logger.debug('Org  : ' + ccparams.org);
	logger.debug("Channel :" + ccparams.channel)
	logger.debug('Chaincode : ' + ccparams.chaincode);
	logger.debug('Version  : ' + ccparams.version);
	logger.debug('Function  : ' + ccparams.function);
	logger.debug('Args : ' + ccparams.args);

	const message = await model.invoke(ccparams);
	res.send(message);
}

exports.query = async (req, res) => {
	logger.info('<<<<<<<<<<<<<<<<< QUERY SC >>>>>>>>>>>>>>>>>');
	const ccparams = req.body;
	logger.debug('Org  : ' + ccparams.org);
	logger.debug("Channel :" + ccparams.channel)
	logger.debug('Chaincode : ' + ccparams.chaincode);
	logger.debug('Version  : ' + ccparams.version);
	logger.debug('Function  : ' + ccparams.function);
	logger.debug('Args : ' + ccparams.args);

	const message = await model.query(ccparams);
	res.send(message);
}