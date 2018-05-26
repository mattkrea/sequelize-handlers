'use strict';

const { createController } = require('../index');
const Sequelize = require('sequelize');
const supertest = require('supertest');
const assert = require('assert');
const db = require('./db');

describe('createChildren()', () => {
	before(async () => {
		await db.sequelize.sync({ force: true })
		await db.author.bulkCreate([
			{ id: 1, name: 'Bud' },
			{ id: 2, name: 'Frank' }
		]);
		await db.post.bulkCreate([
			{ id: 1, authorId: 1, title: 'One Title' },
			{ id: 2, authorId: 1, title: 'Two Titles' },
			{ id: 3, authorId: 2, title: 'Three Titles' }
		]);
	});

	it('GET /<parent>/<id>/<child>', async () => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			createChildren: true
		}));
		app.use(() => done(new Error()));
		const request = supertest(app);
		const response = await request.get('/authors/1/posts');
		assert.equal(response.statusCode, 200);
		assert.equal(response.body.posts.length, 2);
	});

	it('GET /<parent>/<id>/<child>/<id>', async () => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			createChildren: true
		}));
		const request = supertest(app);
		const response = await request.get('/authors/1/posts/2');
		assert.equal(response.statusCode, 200);
		assert.equal(response.body.post.id, 2);
		assert.equal(response.body.post.authorId, 1);
	});

	it('POST /<parent>/<id>/<child>', async () => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			createChildren: true
		}));
		const request = supertest(app);
		const response = await request.post('/authors/1/posts')
			.set('Content-Type', 'application/json')
			.send({
				post: {
					title: 'Random Post',
					description: 'Test'
				}
			});
		assert.equal(response.statusCode, 201);
		assert.equal(response.body.post.authorId, 1);
		assert.equal(response.body.post.description, 'Test');
	});

	it('PUT /<parent>/<id>/<child>/<id>', async () => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			createChildren: true
		}));
		const request = supertest(app);
		const response = await request.put('/authors/1/posts/1')
			.set('Content-Type', 'application/json')
			.send({
				post: {
					title: 'Updated Title'
				}
			})
		assert.equal(response.statusCode, 200);
		assert.equal(response.body.post.title, 'Updated Title');
	});

	it('DELETE /<parent>/<id>/<child>/<id>', async () => {
		const app = require('express')();
		app.use('/authors', createController(db.author, {
			createChildren: true
		}));
		const request = supertest(app);
		const response = await request.delete('/authors/1/posts/1');
		assert.equal(response.statusCode, 200);
		assert.equal(response.body.status, 'ok');
	});
});
