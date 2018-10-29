
/**
 * @author Marco Alarcón
 * @description API router
 */

'use strict';

module.exports.setup = function (app) {

	app.get('/', function (req, res, next) {
		res.render('index', { title: 'HyperLedger Fabric generic Client API - not for use in Production!' });
	});

	app.post('/channels/create', require('../controllers/channel_controller').create);
	app.post('/channels/update', require('../controllers/channel_controller').update);
	app.post('/channels/join', require('../controllers/channel_controller').join);
	app.post('/smartcontract/install', require('../controllers/smartcontract_controller').install);
	app.post('/smartcontract/invoke', require('../controllers/smartcontract_controller').invoke);
	app.post('/smartcontract/query', require('../controllers/smartcontract_controller').query);

};