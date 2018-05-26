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
		Object.keys(routerOptions).forEach((option) => {
			if (option === 'middleware') {
				// Middleware should remain where they are rather than overwriting
				// any that may have been set on the specific controller
				return;
			} else if (option === 'handlers') {
				Object.assign(defaults[option], routerOptions[option]);
			} else {
				defaults[option] = routerOptions[option];
			}
		});
	}
};

const createRouter = (controllerOptions, routerOptions) => {

	if (!Array.isArray(controllerOptions)) {
		throw new TypeError(`'controllerOptions' must be an array`);
	}

	const router = express.Router();

	// Append middleware to the start if we have any top-level included
	applyMiddleware(router, routerOptions);

	// Iterate over provided option sets which should be exactly the same as
	// those that are provided for `createController`
	controllerOptions.forEach((controller) => {

		let model;
		let options = {
			handlers: {
				get: true,
				put: true,
				post: true,
				delete: true
			}
		};

		// If router options were provided we will run through them
		// and override any default controller options
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
	});

	return router;
};

module.exports = createRouter;
