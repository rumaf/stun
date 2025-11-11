# Change Log

All notable changes to the "stun" package will be documented in this file.

## [3.0.00] - 2025-11-11

- dep(eslint): update to 9.39.1
- dep(jest): update to 30.2.0
- Breaking: require node.js >= 18

## [2.1.17] - 2023-12-16

- dep(eslint): update to 8.55.0
- dep(ip): update to 2.0.0

## [2.1.16] - 2023-12-09

- dep(meow): replace with minimist
- dep(parse-url): replace with native URL
    - require node.js >= 10
- ci: replace Travis with GHA


## [2.1.0] - 2019-11-23

- `stun.request` supports promise interface.


## [2.0.0] - 2019-06-02

- Add `request()` method to simplify client-side requests. Follow the `STUN` specification.
- All STUN-related errors inherit `StunError`. See `StunMessageError` and `StunResponseError`.
- `StunMessage` class was replaced by `StunRequest` and `StunResponse`. They represent outgoing and incoming messages. The main difference is that you cannot change incoming message.
- Added simple CLI, use `npx stun` or `npx stun -p 3478`.
- Another incompatible API changes.
