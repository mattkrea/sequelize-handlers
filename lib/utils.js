'use strict';

const Sequelize = require('sequelize');
const pluralize = Sequelize.Utils.pluralize;
const { errors } = require('./constants');

/**
 * Format result set(s) from database queries
 *
 * @param   {Array<Object>|Object} results - Either a single result or multiple
 * @param   {Sequelize.Model}      model - Sequelize data model
 * @param   {Object}               options - Controller configuration
 * @returns {Object} Returns a slightly manipulated object to be sent to the client
 */
const formatOutput = (results, model, options) => {
	let response = {};
	let plural = Array.isArray(results);

	if (options.disableNestedData === true) {
		return results;
	}

	let outputName;

	if (options.overrideOutputName) {
		outputName = options.overrideOutputName;
	} else {
		outputName = model.name;
	}

	if (plural) {
		outputName = pluralize(outputName);
	}

	response[outputName] = results;

	return response;
};

/**
 * Check is the value passed in is a valid Sequelize type
 *
 * @param   {Sequelize.Model} model - Sequelize model
 * @returns {boolean} True if the value is a model
 */
const isSequelizeModel = (model) => {
	if (model instanceof Sequelize.Model) {
		return true;
	} else if (model.prototype && model.prototype instanceof Sequelize.Model) {
		return true;
	}

	return false;
};

/**
 * Translates various error types into HTTP responses
 *
 * @param   {Express.Request}  req - Express HTTP request
 * @param   {Express.Response} res - Express HTTP response
 * @returns {undefined} Return only used to shortcircuit the function
 */
const handleRequestError = (req, res) => {
	return (e) => {
		switch (e.name) {
		case 'SequelizeForeignKeyConstraintError':
			return res.status(400).json({ errors: [{ message: 'foreign key constraint error' }] });
		case 'SequelizeValidationError':
		case 'SequelizeUniqueConstraintError': {
			const results = [];
			e.errors.forEach((x) => {
				results.push({
					message: x.message,
					field: x.path
				});
			});

			return res.status(422).json({ errors: results });
		}
		case 'SequelizeDatabaseError':
			return res.status(422).json({ errors: [{ message: e.message }] });
		}

		switch (e) {
		case errors.notFound:
			return res.status(404).json({ errors: [{ message: e.message }] });
		}

		return res.status(500).json({ errors: [{ message: e.message }] });
	};
};

const execHook = (name, options, ...args) => {
	if (options.hooks && typeof options.hooks[name] === 'function') {
		options.hooks[name](...args);
	}
};

/**
 * Apply provided Express middleware to an existing router
 *
 * @param {Express.Router}  router - Express router
 * @param {Object}          options - Router/controller configuration
 * @param {Array<Function>} [options.middleware] - Middleware to be applied in order
 */
const applyMiddleware = (router, options) => {
	if (options) {
		if (Array.isArray(options.middleware) && options.middleware.length > 0) {
			router.use(options.middleware);
		}
	}
};

module.exports = {
	formatOutput,
	isSequelizeModel,
	handleRequestError,
	execHook,
	applyMiddleware
};
