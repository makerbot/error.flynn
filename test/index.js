'use strict';

const request = require('supertest')
  , express = require('express')
  , bodyParser = require('body-parser')
  , chai = require('chai')
  , expect = chai.expect
  , should = chai.should()
  , sinon = require('sinon')
  , sinonChai = require('sinon-chai')
  , Slack = require('slack-node')
  , flynn = require('../')
  ;

chai.use(sinonChai);

// http://www.brainyquote.com/quotes/quotes/e/errolflynn125391.html
describe('It isn\'t what they say about you, it\'s what they test', () => {
  const spy = sinon.spy(Slack.prototype, 'webhook');
  let app;

  before(() => {
    app = server('https://hooks.slack.com/services/in/with/flynn', {
      author_name: null
    });
  });

  beforeEach(() => {
    spy.reset();
  });

  it('Flynn sends errors to Slack', done => {
    request(app)
      .get('/500')
      .expect(500)
      .end((err, res) => {
        if (err) throw err;
        spy.should.have.been.calledOnce;
        spy.args[0][0].attachments[0].should.have.property('color', 'danger');
        done();
      });
  });

  it('Flynn sends call stack to Slack', done => {
    request(app)
      .get('/500')
      .expect(500)
      .end((err, res) => {
        if (err) throw err;
        spy.should.have.been.calledOnce;
        spy.args[0][0].attachments[0].should.have.property('text')
          .that.includes('Call Stack');
        done();
      });
  });

  it('Flynn sends warnings to Slack', done => {
    request(app)
      .get('/404')
      .expect(404)
      .end((err, res) => {
        if (err) throw err;
        spy.should.have.been.calledOnce;
        spy.args[0][0].attachments[0].should.have.property('color', 'warning');
        done();
      });
  });

  it('Flynn sends request body to Slack', done => {
    request(app)
      .post('/500')
      .send({
        test: 'test',
        a: {
          b: 1
        }
      })
      .expect(500)
      .end((err, res) => {
        if (err) throw err;
        spy.should.have.been.calledOnce;
        const attachment = spy.args[0][0].attachments[0];
        attachment.should.have.property('color', 'danger');
        attachment.should.have.property('text').that.includes('Request Body');
        done();
      });
  });

  it('Flynn sends query string to Slack', done => {
    request(app)
      .get('/500?girlfriend=katharine.hepburn')
      .expect(500)
      .end((err, res) => {
        if (err) throw err;
        spy.should.have.been.calledOnce;
        const attachment = spy.args[0][0].attachments[0];
        attachment.should.have.property('color', 'danger');
        attachment.should.have.property('text').that.includes('Query String');
        done();
      });
  });

  it('Invalid url throws', () => {
    const url = null;
    expect(flynn.bind(null, url)).to.throw(TypeError);
  });

  it('Invalid opt throws', () => {
    const opt = 'test';
    expect(flynn.bind(null, 'http://some.url', opt)).to.throw(TypeError);
  });

  it('Lacking an error, Flynn shuts up', done => {
    request(app)
      .get('/ok')
      .expect(200)
      .end(function(err, res){
        if (err) throw err;
        spy.should.have.not.been.called;
        done();
      });
  });

  after(() => {
    Slack.prototype.webhook.restore();
  });
});

function server(url, opt) {
  const app = express();
  app.use(bodyParser.json());

  app.get('/ok', (req, res) => {
    res.sendStatus(200);
  });

  app.get('/404', (req, res, next) => {
    let err = new Error('Not Found!');
    err.status = 404;
    next(err);
  });

  app.all('/500', (req, res, next) => {
    next(new Error('Oh noooooooo!'));
  });

  app.use(flynn(url, opt));

  app.use((err, req, res, next) => {
    res.sendStatus(err.status || 500);
  });

  return app;
}
