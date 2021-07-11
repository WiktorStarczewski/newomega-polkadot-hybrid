
# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Technical overview - Smart Contracts

The Solutions consists of the following contracts:

* Delegator (newomegadelegator)
* Game Engine (newomega)
* Fight Management (newomegagame)
* Ranked Fight Management (newomegaranked)
* Universe (newomegauniverse)
* Industrial / Addition to Universe (newomegaindustrial) 
* Storage (newomegastorage)

At the very bottom resides the Delegator pattern, represented by the Delegator module.
For more information about each contract, look at the README in their directories.

![NewOmega diagram](https://user-images.githubusercontent.com/78207373/125203015-cd1a4000-e276-11eb-9378-d913323d1d8f.png)


* Delegator

The Delegator is the single point of interaction for the game client, and is responsible for managing (instantiating, exchanging) the other contracts, as well as acting as a facade for their public methods. The only data the Delegator stores is the instances of the other contracts (in addition to the contract creator).

## Testing

### Off-chain
Off-chain (unit) tests are available, whenever possible (in contracts which dont manage other contracts).
To run, use standard ```cargo +nightly test``` from the supported directories.

### On-chain
On-chain testing is ran against a customised Substrate node (https://github.com/celrisen/newomega-node), with an increased contract size cap and removed gas/storage fees.

* Prerequisites
1. Build the solution using ```build.sh``` script provided.
2. Deploy the contracts, in order: newomega, newomegagame, newomegastroage, newomegaranked, newomegauniverse, newomegaindustrial, newomegadelegator.
3. Pass the deployed contract addresses to the constructors as you go.
