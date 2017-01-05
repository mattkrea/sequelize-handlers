# Sequelize Handlers

Create REST handers for Sequelize models

[![npm version](https://badge.fury.io/js/sequelize-rest-handlers.svg)](https://badge.fury.io/js/sequelize-rest-handlers) [![Build Status](https://travis-ci.org/mattkrea/sequelize-handlers.svg?branch=master)](https://travis-ci.org/mattkrea/sequelize-handlers)

## Installation

`npm install sequelize-rest-handlers`

## Usage

### Creating Individual Controllers

If you only need a couple of handlers you can create one for each model
on your own with the syntax below. If you want to create an API for a series
of models check out [Creating Entire APIs](#creating-entire-apis).

```js
	const { createController } = require('sequelize-rest-handlers');
	const models = require('./models');
	const app = require('express')();

	const router = createController(models.Post, {
		// Allow the primary key to be modified during a PUT
		allowChangingPrimaryKey: false,
		// Include model relations in a request to `/`
		// WARNING: this will get slower with large databases
		includeRelationsInGetAll: false
		// Customize the top-level property in the resulting JSON
		overrideOutputName: 'article',
		// By default `body-parser.json()` is enabled on the router--If you wish to
		// disable this you *must* populate `req.body` another way
		disableBodyParser: false,
		// These relations are passed directly to Model.findAll.include
		relationships: [
			db.Author,
			{
				model: db.Comment,
				attributes: [
					'content',
					'author'
				]
			}
		],
		// Optionally add middleware to run at the start of the request
		middleware: [
			(req, res, next) => {
				// ... do something with the request before the
				// other handlers get the request
			}
		],
		hooks: {
			// Need to track changes on models?
			beforeUpdate: function(model, instance) {
				let changes = instance.changed();
				// ... do something with changelog
			},
			// Or maybe you need to modify the Sequelize query
			// based upon some property in the request
			beforeQuery: function(query, request) {
				query.where.locationId = req.currentLocation.get('id');
			}
		}
	});

	// The resulting router will be able to handle:
	// GET /api/v1/articles/
	// GET /api/v1/articles/:articleId
	// PUT /api/v1/articles/:articleId
	// POST /api/v1/articles/
	// DELETE /api/v1/articles/:articleId

	app.use('/api/v1/articles', router);

	app.listen(8080);
```

### Creating Entire APIs

If you just want to generate endpoints for all of your models you can use `createRouter`.

```js
	const { createRouter } = require('sequelize-rest-handlers');
	const models = require('./models');
	const app = require('express')();

	const router = createRouter([
		// You can include either a model by itself
		models.Article,
		// Or you can include a set of options as you would for `createController`
		{
			model: models.Author,
			options: {
				handlers: {
					put: false
				}
			},
			limit: 10
		}
	], {
		// You can also include top-level middleware that will go before
		// all other endpoints
		middleware: [
			(req, res, next) => {
				logger.debug(`${req.method}: ${req.originalUrl} [${req.ip}]`);
				return next();
			}
		],
		// Or you can specify global options for items such as `limit`
		// Note: You can override the globals by setting the same property
		// with a different value on the specific controller's options
		limit: 5
	});

	app.use('/api/v1', router);

	// The resulting app will be able to handle:
	// GET /api/v1/articles/
	// GET /api/v1/articles/:articleId
	// PUT /api/v1/articles/:articleId
	// POST /api/v1/articles/
	// DELETE /api/v1/articles/:articleId
	// GET /api/v1/posts
	// GET /api/v1/posts/:postId
	// PUT /api/v1/posts/:postId
	// ... etc ...

	app.listen(8080);
```

## Query Parameters

Routes generated will support filtering in the Ember style i.e. `/api/v1/articles/?filter[published]=true.

In addition both `limit` and `offset` are supported.

## Supported Hooks

* `beforeUpdate`
* `afterUpdate`
* `afterCreate`
