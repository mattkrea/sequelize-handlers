'use strict';

const Sequelize = require('sequelize');
const pluralize = Sequelize.Utils.pluralize;

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
