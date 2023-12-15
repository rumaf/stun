# Change Log

All notable changes to the "stun" package will be documented in this file.


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
