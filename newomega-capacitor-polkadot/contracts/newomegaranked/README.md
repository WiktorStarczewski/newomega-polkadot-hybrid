# New Omega

* Tactical, space combat game, entirely on blockchain
* Made With Love for Polkadot

## Technical overview - Ranked Fight Management

The logic for all ranked fights between players. Connected to Fight Management in order to run fights, and to Storage in order to save the results and perform actions according to their result (read more in the Storage contract section).

### Security

The control over most of the contracts methods is allowed only for the authorised Delegator. That is why an ```authoriseDelegator``` function should always be called on the contract after deployment (for example due to an upgrade).

### On-Chain Testing
In order to use the ```attack``` function, you need to first register the fleet for the defender and attacker (IMPORTANT).
The ```selection``` and ```variants``` are expected to be 4-element arrays of ```u8``` (it is reported in the Canvas UI). To pass them into the contracts, they need to be converted into byte arrays.
The ```selection``` can contain any ```u8```, the values ```variants``` are expected to be 0, 1, or 2 (panic otherwise). The practical meaning of variants is "fitting", 0 being normal, 1 defensive, and 2 offensive.

#### Tip
[1,1,1,1] = 0x01010101
[2,2,2,2] = 0x02020202
... and so on

1. [as Alice] Execute the ```register_defence``` function with ```0x01010101``` as both ```selection``` and ```variants```. Pass ```0``` for commander, a recognisable string for name (eg. ```Alice```).

* Expected: Contract executes.

2. [as Bob] Execute the ```register_defence``` function with ```0x01010101``` as both ```selection``` and ```variants```. Pass ```0``` for commander, a recognisable string for name (eg. ```Bob```).

* Expected: Contract executes.

3. [as Alice] Execute the ```get_own_defence``` function.

* Expected: One entry, containing Alice's name, selection, variants and commander as passed in step #1.

4. [as Bob] Execute the ```get_own_defence``` function.

* Expected: One entry, containing Bob's name, selection, variants and commander as passed in step #2.

5. [as Alice] Execute the ```attack``` function, setting target to Bob, wth ```0x02020202``` as both ```selection``` and ```variants```. Pass ```0``` for commander.

* Expected: Contract executes.

6. [as whoever] Execute the ```get_leaderboard``` function.

* Expected: Two entries, one for Alice, one for Bob. The Alice entry contains 1 win, 0 losses. Bob has 0 wins and 1 loss.

