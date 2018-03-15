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
