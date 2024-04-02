'use strict';

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const { request } = require('../../src/net/request');
const StunResponse = require('../../src/message/response');
const { createMessage } = require('../../src/lib/create-message');
const { messageType } = require('../../src/lib/constants');
const StunServer = require('../../src/net/dgram-server');
const { createServer } = require('../../src/net/create-server');

test('should work', (t, done) => {

  request('stun://stun.l.google.com:19302', (error, res) => {
    assert.equal(error, null);
    assert.equal(true, res instanceof StunResponse);

    done();
  });
});

test('should work as promise', async () => {
  const res = await request('stun://stun.l.google.com:19302');
  assert.equal(true, res instanceof StunResponse);
});

test('url normalization should work', (t, done) => {

  request('stun.l.google.com:19302', (error, res) => {
    assert.equal(error, null);
    assert.equal(true, res instanceof StunResponse);

    done();
  });
});

test('should use provided STUN server', (t, done) => {

  const socket = {
    on: function () {},
    once: function () {},
    removeListener: function () {},
  };
  const server = new StunServer(socket);
  let called = 0
  server.send = function () { called++; }

  request('stun.l.google.com:19302', { server, retries: 0 }, () => {
    assert.equal(called, 1);
    done();
  });
});

test('should use provided message', (t, done) => {

  const server = createServer({ type: 'udp4' });
  const request_ = createMessage(messageType.BINDING_REQUEST);

  const options = {
    server,
    retries: 0,
    message: request_,
  };

  request('stun.l.google.com:19302', options, (error, res) => {
    assert.equal(error, null);
    assert.equal(res.transactonId, request_.transactonId);
    server.close();
    done();
  });
});
