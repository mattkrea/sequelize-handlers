'use strict';

const { formatOutput, handleRequestError, execHook } = require('./utils');
const { errors, hooks } = require('./constants');

/**
 * Find an individual record in the database
 *
 * @param   {Sequelize.Model}  model - Sequelize data model
 * @param   {Object}           query - Sequelize query options
 * @param   {Express.Request}  req - Express HTTP request
 * @param   {Express.Response} res - Express HTTP response
 * @param   {Object}           options - Controller configuration
 * @returns {Promise} Resolves after query completion
 */
const findOne = (model, query, req, res, options) => {
	return model.findOne(query).then((results) => {
		if (!results) {
			throw errors.notFound;
		}

		return res.status(200).json(formatOutput(results, model, options));
	}).catch(handleRequestError(req, res));
};

/**
 * Find a series of related records in the database
 *
 * @param   {Sequelize.Model}  model - Sequelize data model
 * @param   {Object}           query - Sequelize query options
 * @param   {Express.Request}  req - Express HTTP request
 * @param   {Express.Response} res - Express HTTP response
 * @param   {Object}           options - Controller configuration
 * @returns {Promise} Resolves after query completion
 */
const findAll = (model, query, req, res, options) => {
	return model.findAll(query).then((results) => {
		return res.status(200).json(formatOutput(results, model, options));
	}).catch((e) => {
		return res.status(500).json({ errors: [{ message: e.message }] });
	});
};

/**
 * Create a new record
 *
 * @param   {Sequelize.Model}  model - Sequelize data model
 * @param   {Object}           query - Sequelize query options
 * @param   {Object}           input - Parameters to populate record properties
 * @param   {Express.Request}  req - Express HTTP request
 * @param   {Express.Response} res - Express HTTP response
 * @param   {Object}           options - Controller configuration
 * @returns {Promise} Resolves after query completion
 */
const createRecord = (model, query, input, req, res, options) => {
	return model.create(input, query).then((results) => {
		execHook(hooks.AFTER_CREATE, options, model, results);
		return res.status(201).json(formatOutput(results, model, options));
	}).catch(handleRequestError(req, res));
};

/**
 * Delete a given record from the database
 *
 * @param   {Sequelize.Model}  model - Sequelize data model
 * @param   {Object}           query - Sequelize query options
 * @param   {Express.Request}  req - Express HTTP request
 * @param   {Express.Response} res - Express HTTP response
 * @returns {Promise} Resolves after query completion
 */
const deleteRecord = (model, query, req, res) => {
	return model.destroy(query).then((affected) => {
		if (affected !== 1) {
			throw errors.notFound;
		}

		return res.status(200).json({ status: 'ok' });
	}).catch(handleRequestError(req, res));
};

module.exports = {
	findOne,
	findAll,
	createRecord,
	deleteRecord
};
