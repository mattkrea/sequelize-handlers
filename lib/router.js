'use strict';

const createController = require('./controller');
const { isSequelizeModel, applyMiddleware } = require('./utils');
const { errors } = require('./constants');
const dasherize = require('dasherize');
const express = require('express');

/**
 * Overrides default settings with those optionally provided at
 * the router level
 *
 * @param {Object} defaults - Default configuration
 * @param {Object} routerOptions - Global overrides
 */
const applyGlobalOptions = (defaults, routerOptions) => {
	if (routerOptions) {
		for (const option of Object.keys(routerOptions)) {
			switch (option) {
			case 'middleware':
				// Top-level middleware have already been applied
				break;
			case 'handlers':
				Object.assign(defaults[option], routerOptions[option]);
				break;
			default:
				defaults[option] = routerOptions[option];
			}
		}
	}
};

const createRouter = (controllerOptions, routerOptions) => {

	if (!Array.isArray(controllerOptions)) {
		throw new TypeError(`'controllerOptions' must be an array`);
	}

	const router = express.Router();

	// Append middleware to the start if we have any top-level included
	applyMiddleware(router, routerOptions);

	for (const controller of controllerOptions) {
		let model;
		let options = {
			handlers: {
				get: true,
				put: true,
				post: true,
				delete: true
			}
		};

		applyGlobalOptions(options, routerOptions);

		if (isSequelizeModel(controller)) {
			model = controller;
		} else if (isSequelizeModel(controller.model)) {
			model = controller.model;
			options = Object.assign(options, controller.options);
		} else {
			throw errors.invalidModel;
		}

		router.use(`/${dasherize(model.options.name.plural)}`, createController(model, options));
	}

	return router;
};

module.exports = createRouter;
