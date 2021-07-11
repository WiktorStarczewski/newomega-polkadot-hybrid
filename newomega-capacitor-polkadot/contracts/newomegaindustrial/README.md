# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Technical overview - Industrial

Addition to the Universe, offloading certain aspects to a separate contract. Currenly controls ship production and is essentially a wrapper around Storage.

### Security

The control over most of the contracts methods is allowed only for the authorised Delegator. That is why an ```authoriseDelegator``` function should always be called on the contract after deployment (for example due to an upgrade).