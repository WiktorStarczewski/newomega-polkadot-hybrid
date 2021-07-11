# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Technical overview - Storage

Isolated storage for all things which should be considered player progress. This module should only ever change if a serious API change is needed, but otherwise it should survive most upgrades of the rest of the system, preserving the Game Board (state of the game) across upgrades and bugfixes. The only logic that belongs here is accessors for the storage.

### Security

The control over most of the contracts methods is allowed only for the authorised Delegator. That is why an ```authoriseDelegator``` function should always be called on the contract after deployment (for example due to an upgrade).

Additionally, the contract requires authorising the Universe, Ranked and Industrial contracts after deployment in similar fashion, through the usage of ```authoriseUniverseContract```, ```authoriseRankedContract``` and ```authoriseIndustrialContract``` functions.

### Testing

Off-chain test suite is available for this contract. Run ```cargo +nightly test``` to execute them.