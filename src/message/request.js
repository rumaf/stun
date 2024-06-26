'use strict';

const crypto = require('crypto');
const crc32 = require('turbo-crc32/crc32');
const {
  createEncodeStream,
  encode,
  encodingLength,
  types: { array },
} = require('binary-data');
const StunMessage = require('./message');
const constants = require('../lib/constants');
const attributes = require('../lib/attributes');
const { StunMessagePacket, StunAttributePacket } = require('../lib/protocol');

const {
  attributeType,
  messageType,
  kStunFingerprintXorValue,
  kStunFingerprintLength,
  kStunMessageIntegrityLength,
  kStunTransactionIdLength,
  kStunMessageIntegritySize,
  kStunLegacyTransactionIdLength,
} = constants;

const kMessageType = Symbol.for('kMessageType');
const kTransactionId = Symbol.for('kTransctionId');
const kCookie = Symbol.for('kCookie');
const kAttributes = Symbol.for('kAttributes');

const EMPTY_MESSAGE_INTEGRITY = Buffer.alloc(kStunMessageIntegritySize, 0);

const toUInt32 = (x) => x >>> 0; // eslint-disable-line no-bitwise
const MAX_INT32 = 0x7fffffff;
const MIN_INT32 = -2147483648;
const isINT32 = (v) => v <= MAX_INT32 && v >= MIN_INT32;

/**
 * This class implements outgoing STUN messages.
 */
class StunRequest extends StunMessage {
  /**
   * Set message type.
   * @param {number} type - A message type, see constants.
   */
  setType(type) {
    this[kMessageType] = Number(type);
  }

  /**
   * Set `transaction` field for cuurent message.
   * @param {Buffer} transactionId The value of `transaction` field.
   * @returns {boolean} Was the operation successful or not.
   */
  setTransactionId(transactionId) {
    if (!isValidTransactionId(transactionId)) {
      return false;
    }

    this[kTransactionId] = transactionId;
    return true;
  }

  /**
   * Add an attribute for the message.
   * @param {number} type Attribute type.
   * @param {any[]} arguments_ Values of an attribute.
   * @returns {StunAttribute|undefined} Return `false` if attribute already exist, otherwise return `true`.
   */
  addAttribute(type, ...arguments_) {
    const attribute = attributes.create(type, ...arguments_);
    attribute.setOwner(this);

    /** @type {StunAttribute[]} */
    const attribute_ = this[kAttributes];

    // It should be one unique attribute type per message.
    if (this.hasAttribute(type)) {
      return undefined;
    }

    attribute_.push(attribute);
    return attribute;
  }

  /**
   * Remove attribute from current message.
   * @param {number} type - Attribute type.
   * @returns {boolean} The result of an operation.
   */
  removeAttribute(type) {
    /** @type {StunAttribute[]} */
    const attribute_ = this[kAttributes];

    const index = attribute_.findIndex((attribute) => attribute.type === type);

    switch (index) {
      case -1:
        return undefined;
      case 0:
        return attribute_.shift();
      case attribute_.length - 1:
        return attribute_.pop();
      default:
        break;
    }

    const next = new Array(attribute_.length - 1);
    const attribute = attribute_[index];

    for (let j = 0, offset = 0; j < next.length; ++j) {
      if (index === j) {
        offset = 1;
      }

      next[j] = attribute_[j + offset];
    }

    this[kAttributes] = next;
    return attribute;
  }

  /**
   * Add MAPPED_ADDRESS attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {boolean}
   */
  addAddress(address, port) {
    return this.addAttribute(attributeType.MAPPED_ADDRESS, address, port);
  }

  /**
   * Add ALTERNATE-SERVER attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {boolean}
   */
  addAlternateServer(address, port) {
    return this.addAttribute(attributeType.ALTERNATE_SERVER, address, port);
  }

  /**
   * Add XOR_MAPPED_ADDRESS attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {boolean}
   */
  addXorAddress(address, port) {
    return this.addAttribute(attributeType.XOR_MAPPED_ADDRESS, address, port);
  }

  /**
   * Add USERNAME attribute.
   * @param {string|Buffer} username
   * @returns {boolean}
   */
  addUsername(username) {
    if (username.length > 513) {
      throw new Error(
        'Username should be less than 513 bytes, see' +
          ' https://tools.ietf.org/html/rfc5389#section-15.3'
      );
    }
    return this.addAttribute(attributeType.USERNAME, username);
  }

  /**
   * Add ERROR-CODE attribute.
   * @param {number} code
   * @param {string} [reason]
   * @returns {boolean}
   */
  addError(code, reason) {
    assertErrorType(this.type);

    // The Class represents
    // the hundreds digit of the error code.  The value MUST be between 3
    // and 6.  The Number represents the error code modulo 100, and its
    // value MUST be between 0 and 99.
    if (code < 300 || code > 699) {
      throw new Error(
        'Error code should between 300 - 699, see https://tools.ietf.org/html/rfc5389#section-15.6'
      );
    }

    if (reason && reason.length > 128) {
      throw new Error(
        'The reason phrase MUST be a UTF-8 encoded sequence of less than 128 characters'
      );
    }

    // Set default error reason for standart error codes.
    if (!reason && constants.errorNames.has(code)) {
      // eslint-disable-next-line no-param-reassign
      reason = constants.errorReason[constants.errorNames.get(code)];
    }

    return this.addAttribute(attributeType.ERROR_CODE, code, reason);
  }

  /**
   * Add REALM attribute.
   * @param {string} realm
   * @returns {boolean}
   */
  addRealm(realm) {
    assert128string(realm);

    return this.addAttribute(attributeType.REALM, realm);
  }

  /**
   * Add NONCE attribute.
   * @param {string} nonce
   * @returns {boolean}
   */
  addNonce(nonce) {
    assert128string(nonce);

    return this.addAttribute(attributeType.NONCE, nonce);
  }

  /**
   * Add SOFTWARE attribute.
   * @param {string} software
   * @returns {boolean}
   */
  addSoftware(software) {
    assert128string(software);

    return this.addAttribute(attributeType.SOFTWARE, software);
  }

  /**
   * Add UNKNOWN-ATTRIBUTES attribute.
   * @param {number[]} attributes_ List of an unknown attributes.
   * @returns {boolean}
   */
  addUnknownAttributes(attributes_) {
    assertErrorType(this.type);

    return this.addAttribute(attributeType.UNKNOWN_ATTRIBUTES, attributes_);
  }

  /**
   * Adds a MESSAGE-INTEGRITY attribute that is valid for the current message.
   * @param {string} key Secret hmac key.
   * @returns {boolean} The result of an operation.
   */
  addMessageIntegrity(key) {
    if (!key) {
      return false;
    }

    const attributeIntegrity = this.addAttribute(
      attributeType.MESSAGE_INTEGRITY,
      EMPTY_MESSAGE_INTEGRITY
    );
    const message = this.toBuffer();

    if (message.length === 0) {
      return false;
    }

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(message.slice(0, -kStunMessageIntegrityLength));

    return attributeIntegrity.setValue(hmac.digest());
  }

  /**
   * Adds a FINGERPRINT attribute that is valid for the current message.
   *
   * @returns {boolean} The result of an operation.
   */
  addFingerprint() {
    const attributeFingerprint = this.addAttribute(attributeType.FINGERPRINT, 0);
    const message = this.toBuffer();

    if (message.length === 0) {
      return false;
    }

    const crc32buf = message.slice(0, -kStunFingerprintLength);
    return attributeFingerprint.setValue(
      toUInt32(crc32(crc32buf) ^ kStunFingerprintXorValue) // eslint-disable-line no-bitwise
    );
  }

  /**
   * Add PRIORITY attribute.
   * @param {number} priority
   * @returns {boolean}
   */
  addPriority(priority) {
    if (!Number.isInteger(priority) || !isINT32(priority)) {
      throw new TypeError('The argument should be 32-bit integer.');
    }

    return this.addAttribute(attributeType.PRIORITY, priority);
  }

  /**
   * Add USE-CANDIDATE attribute.
   * @returns {boolean}
   */
  addUseCandidate() {
    return this.addAttribute(attributeType.USE_CANDIDATE);
  }

  /**
   * Add ICE-CONTROLLED attribute.
   * @param {Buffer} tiebreaker
   * @returns {boolean}
   */
  addIceControlled(tiebreaker) {
    assertBindingRequest(this.type);

    if (!Buffer.isBuffer(tiebreaker) || tiebreaker.length !== 8) {
      throw new Error('The content of the attribute shoud be a 64-bit unsigned integer');
    }

    return this.addAttribute(attributeType.ICE_CONTROLLED, tiebreaker);
  }

  /**
   * Add ICE-CONTROLLING attribute.
   * @param {Buffer} tiebreaker
   * @returns {boolean}
   */
  addIceControlling(tiebreaker) {
    assertBindingRequest(this.type);

    if (!Buffer.isBuffer(tiebreaker) || tiebreaker.length !== 8) {
      throw new Error('The content of the attribute shoud be a 64-bit unsigned integer');
    }

    return this.addAttribute(attributeType.ICE_CONTROLLING, tiebreaker);
  }

  /**
   * Convert current message to the Buffer.
   *
   * @param {Object} encodeStream Output stream from binary-data.
   * @returns {boolean} The result of an operation.
   */
  write(encodeStream) {
    /** @type {StunAttribute[]} */
    const attrmap = this[kAttributes];

    const attributes_ = attrmap.map((attribute) => ({
      type: attribute.type,
      value: attribute.toBuffer(),
    }));

    const packet = {
      header: {
        type: this.type,
        length: encodingLength(attributes_, array(StunAttributePacket, attributes_.length)),
        cookie: this[kCookie],
        transaction: this.transactionId,
      },
      attributes: attributes_,
    };

    encode(packet, encodeStream, StunMessagePacket);
    return true;
  }

  /**
   * Convert current message to the Buffer.
   * @returns {Buffer} Encoded stun message.
   */
  toBuffer() {
    const encodeStream = createEncodeStream();

    this.write(encodeStream);
    return encodeStream.slice();
  }
}

// Soft deprecate setTransactionID().
StunRequest.prototype.setTransactionID = StunRequest.prototype.setTransactionId;

/**
 * Check if tranasction id is valid.
 * @param {Buffer} transactionId - `transction` field from a stun message.
 * @returns {boolean} The result of an operation.
 */
function isValidTransactionId(transactionId) {
  return (
    Buffer.isBuffer(transactionId) &&
    (transactionId.length === kStunTransactionIdLength ||
      transactionId.length === kStunLegacyTransactionIdLength)
  );
}

/**
 * Check if argument is a 128 characters string.
 * @param {any} string
 */
function assert128string(string) {
  if (typeof string !== 'string' || string.length > 128) {
    throw new Error('The argument MUST be a UTF-8 encoded sequence of less than 128 characters');
  }
}

/**
 * Check if message type class is ERROR.
 * @param {number} type Message type.
 */
function assertErrorType(type) {
  const isErrorType =
    type === messageType.BINDING_ERROR_RESPONSE ||
    type === messageType.ALLOCATE_ERROR_RESPONSE ||
    type === messageType.REFRESH_ERROR_RESPONSE;

  if (!isErrorType) {
    throw new Error('The attribute should be in ERROR_RESPONSE messages');
  }
}

/**
 * Check if message type is BINDING-REQUEST.
 * @param {number} type Message type.
 */
function assertBindingRequest(type) {
  if (type !== messageType.BINDING_REQUEST) {
    throw new Error('The attribute should present in a Binding request.');
  }
}

module.exports = StunRequest;
