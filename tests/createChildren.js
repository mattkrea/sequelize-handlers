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
		app.use(() => done(new Error()));
		const request = supertest(app);
		const response = await request.get('/authors/1/posts/2');
		assert.equal(response.statusCode, 200);
		assert.equal(response.body.post.id, 2);
		assert.equal(response.body.post.authorId, 1);
	});
});
