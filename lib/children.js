'use strict';

const { findOne, findAll, createRecord, deleteRecord } = require('./database');
const { formatOutput, handleRequestError } = require('./utils');
const { methods, errors } = require('./constants');
const { buildWhere } = require('./querying');
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
	let query = buildWhere(methods.GET, req, options);
	// Adjust the query to filter on the child
	query.where[model.associations[association].foreignKey] = req.params.parent;
	// Exclude relations since we will assume the caller already
	// knows the related (i.e. parent) models
	delete query.include;
	return query;
};

const createChildren = (router, model, opts) => {

	const associations = Object.keys(model.associations);

	for (const association of associations) {

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
				const query = buildWhere(methods.POST, req, options);
				return createRecord(child, query, input, req, res, options);
			});
		}

		if (options.handlers.put === true) {
			router.put(`/:parent/${dasherize(association)}/:id`, (req, res) => {

				// Prevent a consumer from changing the primary key of a given record
				if (options.allowChangingPrimaryKey !== true
					&& child.primaryKeyField
					&& typeof req.body[child.name][child.primaryKeyField] !== 'undefined') {

					if (req.params.id != req.body[child.name][child.primaryKeyField]) {
						return res.status(422).json({
							errors: [{
								message: 'cannot change record primary key',
								field: child.primaryKeyField
							}]
						});
					}
				}

				const query = buildWhere(methods.PUT, req, options);
				query.where[model.associations[association].foreignKey] = req.params.parent;

				child.findOne(query).then((result) => {
					if (!result) {
						throw errors.notFound;
					}

					let input = (options.disableNestedData === true ? req.body : req.body[child.name]);

					Object.keys(input).forEach((field) => {
						result.set(field, input[field]);
					});

					if (options.hooks && typeof options.hooks.beforeUpdate === 'function') {
						options.hooks.beforeUpdate(child, result);
					}

					return result.save();
				}).then((results) => {

					if (options.hooks && typeof options.hooks.afterUpdate === 'function') {
						options.hooks.afterUpdate(child, results);
					}

					return res.status(200).json(formatOutput(results, child, options));
				}).catch(handleRequestError(req, res));
			});
		}

		if (options.handlers.delete === true) {
			router.delete(`/:parent/${dasherize(association)}/:id`, (req, res) => {
				const query = buildWhere(methods.DELETE, req, options);
				query.where[model.associations[association].foreignKey] = req.params.parent;
				return deleteRecord(child, query, req, res);
			});
		}
	}
};

module.exports = createChildren;
