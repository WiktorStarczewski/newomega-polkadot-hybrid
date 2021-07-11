# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Fight Management contract

Wraps the Game Engine with a bit of storage, which contains the definition of ships (their statistics). The allows for separation of the Engine logic from ships, which is useful because it allows the Engine to remain pure.

### Security

The control over most of the contracts methods is allowed only for the authorised Delegator. That is why an ```authoriseDelegator``` function should always be called on the contract after deployment (for example due to an upgrade).