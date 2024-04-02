'use strict';

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')

const stun = require('../src/index');
const constants = require('../src/lib/constants');

describe('should export', () => {
  const exportTable = [
    'createMessage',
    'createServer',
    'validateFingerprint',
    'validateMessageIntegrity',
    'StunMessage',
    'StunServer',
    'StunError',
    'StunMessageError',
    'StunResponseError',
    'constants',
  ];

  const exports = Object.keys(stun);

  for (const think of exportTable) {
    test(`should export ${think}`, () => {
      assert.equal(exports[think], exportTable[think]);
    });
  }
});

describe('should export constants', () => {
  for (const messageType of Object.keys(constants.messageType)) {
    const type = `STUN_${messageType}`;

    test(`should export ${type}`, () => {
      assert.equal(stun.constants[type], constants.messageType[messageType])
    });
  }

  for (const errorCode of Object.keys(constants.errorCode)) {
    const code = `STUN_CODE_${errorCode}`;

    test(`should export ${code}`, () => {
      assert.equal(stun.constants[code], constants.errorCode[errorCode])
    });
  }

  for (const errorReason of Object.keys(constants.errorReason)) {
    const reason = `STUN_REASON_${errorReason}`;

    test(`should export ${reason}`, () => {
      assert.equal(stun.constants[reason], constants.errorReason[errorReason])
    });
  }

  for (const attributeType of Object.keys(constants.attributeType)) {
    const attribute = `STUN_ATTR_${attributeType}`;

    test(`should export ${attribute}`, () => {
      assert.equal(stun.constants[attribute], constants.attributeType[attributeType])
    });
  }

  for (const eventName of Object.keys(constants.eventNames)) {
    const event = `STUN_${eventName}`;

    test(`should export ${event}`, () => {
      assert.equal(stun.constants[event], constants.eventNames[eventName])
    });
  }
});
