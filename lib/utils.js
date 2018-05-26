'use strict';

const Sequelize = require('sequelize');
const pluralize = Sequelize.Utils.pluralize;
const { errors } = require('./constants');

exports.formatOutput = (results, model, options) => {
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
 * @param   {Sequelize.Model} model - Sequelize model
 * @returns {boolean} True if the value is a model
 */
exports.isSequelizeModel = (model) => {
	if (model instanceof Sequelize.Model) {
		return true;
	} else if (model.prototype && model.prototype instanceof Sequelize.Model) {
		return true;
	}

	return false;
};

exports.handleRequestError = (req, res) => {
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
