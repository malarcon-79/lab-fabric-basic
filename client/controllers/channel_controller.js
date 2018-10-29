/**
 * @author Marco Alarcón
 * @description Admin Channels controller
 */

'use strict';

const model = require('../models/admin_channel');
const logger = require('winston');

exports.create = async function (req, res) {
	logger.info('<<<<<<<<<<<<<<<<< CREATE CHANNEL >>>>>>>>>>>>>>>>>');
	const ccparams = req.body;
	logger.debug('Org : ' + ccparams.org);
	logger.debug('Channel : ' + ccparams.channel);
	logger.debug('ConfigPath : ' + ccparams.configPath);

	const message = await model.create(ccparams);
	res.send(message);
}

exports.update = async function (req, res) {
	logger.info('<<<<<<<<<<<<<<<<< UPDATE CHANNEL >>>>>>>>>>>>>>>>>');
	const ccparams = req.body;
	logger.debug('Org : ' + ccparams.org);
	logger.debug('Channel : ' + ccparams.channel);
	logger.debug('ConfigPath : ' + ccparams.configPath);

	const message = await model.update(ccparams);
	res.send(message);
}

exports.join = async function (req, res) {
	logger.info('<<<<<<<<<<<<<<<<< JOIN CHANNEL >>>>>>>>>>>>>>>>>');
	const ccparams = req.body;
	logger.debug('Org : ' + ccparams.org);
	logger.debug('Channel : ' + ccparams.channel);

	const message = await model.join(ccparams);
	res.send(message);
}