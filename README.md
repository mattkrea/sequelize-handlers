# Sequelize REST Handlers
Create REST handers for Sequelize models

## Usage
```js
	const { createController } = require('@harbortouch/sequelize-rest-handlers');
	const models = require('./models');
	const app = require('express')();

	const router = createController(models.Post, {
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
		hooks: {
			beforeUpdate: function(model, instance) {
				let changes = instance.changed();
				// ... do something with changelog
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

## Query Parameters

Routes generated will support filtering in the Ember style i.e. `/api/v1/articles/?filter[published]=true.

In addition both `limit` and `offset` are supported.

## Supported Hooks

* `beforeUpdate`
* `afterUpdate`
* `afterCreate`
