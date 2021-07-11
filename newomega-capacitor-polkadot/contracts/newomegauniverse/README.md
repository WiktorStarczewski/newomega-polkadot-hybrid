# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Technical overview - Universe Module

Controls the Universe mode, players Systems, Universes, Ships and Minerals.

Storage is comprised of hash maps, indexed by the AccountId. The main hash map is ```systems```, values of which are the Systems comprising a players Universe. Additionally, ```assets``` stores additional information about the players, currently only the name.

To position Systems in the Universe, a ```SystemCoordinate``` struct is used, whose ```root``` defines the Universe owner, and ```position_x``` / ```position_y``` are used as coordinates, where ```0:0``` is the root (starting) System every player begins with.

### Security

The control over most of the contracts methods is allowed only for the authorised Delegator. That is why an ```authoriseDelegator``` function should always be called on the contract after deployment (for example due to an upgrade).

### Testing

Off-chain test suite is available for this contract. Run ```cargo +nightly test``` to execute them.