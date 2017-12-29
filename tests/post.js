'use strict';

const { createController } = require('../index');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('POST /<model>', () => {
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

	it('should throw validation error for missing fields', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.post('/authors')
			.expect(422, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'author.name cannot be null');
				done();
			});
	});

	it('should reject duplicate primary keys', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 1,
					name: 'Stan'
				}
			})
			.expect(422, (e, res) => {
				assert.equal(res.body.errors.length, 1);
				assert.equal(res.body.errors[0].message, 'id must be unique');
				done();
			});
	});

	it('should create valid object', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 3,
					name: 'Stan'
				}
			})
			.expect(422, (e, res) => {
				assert.equal(res.body.errors, undefined);
				assert.equal(res.body.author.name, 'Stan');
				done();
			});
	});

	it('should create valid object with relationships', (done) => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			relationships: [
				db.post
			]
		}));
		const request = supertest(app);

		request.post('/authors')
			.set('Content-Type', 'application/json')
			.send({
				author: {
					id: 4,
					name: 'Deb',
					posts: [
						{
							title: 'Should'
						},
						{
							title: 'Create'
						},
						{
							title: 'These'
						}
					]
				}
			})
			.expect(200, (e, res) => {
				assert.equal(res.body.errors, undefined);
				assert.equal(res.body.author.name, 'Deb');
				assert.equal(res.body.author.posts.length, 3);
				done();
			});
	});
});
