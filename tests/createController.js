'use strict';

const { createController } = require('../index');
const Sequelize = require('sequelize');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('createController()', () => {
	before((done) => {
		db.sequelize.sync({ force: true }).then(() => {
			return db.author.bulkCreate([
				{
					id: 1,
					name: 'Bud'
				},
				{
					id: 2,
					name: 'Frank'
				}
			]).then(() => {
				return db.post.bulkCreate([
					{
						id: 1,
						authorId: 1,
						title: 'One Title'
					},
					{
						id: 2,
						authorId: 1,
						title: 'Two Titles'
					},
					{
						id: 3,
						authorId: 2,
						title: 'Three Titles'
					}
				]);
			});
		}).then(() => {
			done();
		}).catch(done);
	});

	it('should require a Sequelize model', (done) => {
		try {
			createController('author', {});
			done(true);
		} catch (e) {
			done();
		}
	});

	it('should not require any options', (done) => {
		try {
			createController(db.author);
			done();
		} catch (e) {
			done(e);
		}
	});

	it('should support middleware', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			middleware: [
				(req, res, next) => {
					req.testValue = 'test';
					return next();
				},
				(req) => {
					assert.equal(req.testValue, 'test');
					done();
				}
			]
		}));
		const request = supertest(app);

		request.get('/authors')
			.expect(200, () => {
				// Nothing
			});
	});

	it('should allow disabling the bodyparser', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			disableBodyParser: true,
			middleware: [
				(req) => {
					assert.equal(typeof req.body, 'undefined');
					done();
				}
			]
		}));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				name: 'Test'
			})
			.expect(200, () => {
				// Nothing
			});
	});

	it('should support a beforeQuery hook', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			hooks: {
				beforeQuery: (query) => {
					assert.equal(query.where.id, 1);
					done();
				}
			}
		}));
		const request = supertest(app);

		request.get('/authors/1')
			.expect(200, () => {
				// Nothing
			});
	});

	it('should support a afterCreate hook', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			hooks: {
				afterCreate: (model, instance) => {
					assert.equal(instance.get('id'), 4);
					done();
				}
			}
		}));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 4,
					name: 'Testerooni'
				}
			})
			.expect(200, () => {
				// Nothing to do here
			});
	});

	it('should support a beforeUpdate hook', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			hooks: {
				beforeUpdate: (model, instance) => {
					assert.equal(instance instanceof Sequelize.Instance, true);
					done();
				}
			}
		}));
		const request = supertest(app);

		request.put('/authors/1')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 1,
					name: 'Bam'
				}
			})
			.expect(200, () => {
				// Nothing to do here
			});
	});

	it('should support a afterUpdate hook', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			hooks: {
				afterUpdate: (model, instance) => {
					assert.equal(instance instanceof Sequelize.Instance, true);
					done();
				}
			}
		}));
		const request = supertest(app);

		request.put('/authors/1')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 1,
					name: 'Bam'
				}
			})
			.expect(200, () => {
				// Nothing to do here
			});
	});

	it('should allow disabling of specific handlers', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			handlers: {
				get: false,
				put: true,
				post: true,
				delete: true
			}
		}));
		app.use(() => {
			done();
		});
		const request = supertest(app);

		request.get('/authors/1')
			.expect(200, () => {
				// Nothing to do here
			});
	});

	it('should allow non-nested data submission and response', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			disableNestedData: true
		}));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				id: 5,
				name: 'non-nested'
			})
			.expect(200, (e, res) => {
				assert.equal(res.body.name, 'non-nested');
				done();
			});
	});
});
