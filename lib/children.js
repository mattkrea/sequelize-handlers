'use strict';

const { findOne, findAll, createRecord, updateRecord, deleteRecord } = require('./database');
const { buildWhere } = require('./querying');
const { HTTP_METHOD } = require('./constants');
const dasherize = require('dasherize');

/**
 * Configure the query to be used for SELECT calls
 *
 * @param   {Sequelize.Model} model - Sequelize parent data model
 * @param   {string}          association - Name of the child association
 * @param   {Express.Request} req - Express HTTP request
 * @param   {Object}          options - Controller configuration
 * @returns {Object} Returns configured query parameters
 */
const buildGet = (model, association, req, options) => {
	let query = buildWhere(HTTP_METHOD.GET, req, options);
	// Adjust the query to filter on the child
	query.where[model.associations[association].foreignKey] = req.params.parent;
	// Exclude relations since we will assume the caller already
	// knows the related (i.e. parent) models
	delete query.include;
	return query;
};

const createChildren = (router, model, opts) => {
	for (const association of Object.keys(model.associations)) {
		// For now we can't support models with a mapping table
		// so skip if we encounter any
		if (typeof model.associations[association].through !== 'undefined') {
			continue;
		}

		// We're going to skip singular associations for now as well since
		// they don't provide much value e.g. /posts/1/author
		if (model.associations[association].isSingleAssociation === true) {
			continue;
		}

		// We also need to disallow overriding output names for children
		// currently since they would conflict with the parent
		const options = Object.assign(opts, { overrideOutputName: null });

		const child = model.associations[association].target;

		if (options.handlers.get === true) {
			router.get(`/:parent/${dasherize(association)}/:id`, (req, res) => {
				const query = buildGet(model, association, req, options);
				return findOne(child, query, req, res, options);
			});

			router.get(`/:parent/${dasherize(association)}`, (req, res) => {
				const query = buildGet(model, association, req, options);
				return findAll(child, query, req, res, options);
			});
		}

		if (options.handlers.post === true) {
			router.post(`/:parent/${dasherize(association)}`, (req, res) => {
				let input = (options.disableNestedData === true ? req.body : req.body[child.name]);
				input[model.associations[association].foreignKey] = req.params.parent;
				const query = buildWhere(HTTP_METHOD.POST, req, options);
				return createRecord(child, query, input, req, res, options);
			});
		}

		if (options.handlers.put === true) {
			router.put(`/:parent/${dasherize(association)}/:id`, (req, res) => {
				const query = buildWhere(HTTP_METHOD.PUT, req, options);
				query.where[model.associations[association].foreignKey] = req.params.parent;
				const input = (options.disableNestedData === true ? req.body : req.body[child.name]);
				return updateRecord(child, query, input, req, res, options);
			});
		}

		if (options.handlers.delete === true) {
			router.delete(`/:parent/${dasherize(association)}/:id`, (req, res) => {
				const query = buildWhere(HTTP_METHOD.DELETE, req, options);
				query.where[model.associations[association].foreignKey] = req.params.parent;
				return deleteRecord(child, query, req, res);
			});
		}
	}
};

module.exports = createChildren;
