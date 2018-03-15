'use strict';

exports.methods = {
	GET: 'GET',
	PUT: 'PUT',
	POST: 'POST',
	PATCH: 'PATCH',
	DELETE: 'DELETE'
};

exports.errors = {
	notFound: new Error(`record not found`),
	invalidModel: new TypeError(`'model' must be a valid Sequelize model`)
};
