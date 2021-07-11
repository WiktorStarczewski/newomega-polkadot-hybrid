#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegastorage::NewOmegaStorage;
pub use self::newomegastorage::PlayerData;
pub use self::newomegastorage::MAX_MINERALS;
pub use self::newomegastorage::RegisteredTrade;

/// Isolated storage for all things which should be considered player progress.
/// This module should only ever change if a serious API change is needed, but otherwise
/// it should survive most upgrades of the rest of the system, preserving the Game Board
/// (state of the game) across upgrades and bugfixes.
/// The only logic that belongs here is accessors for the storage.
#[ink::contract]
mod newomegastorage {
    use ink_prelude::vec::Vec;
    use newomega::MAX_SHIPS;
    use ink_storage::{
        collections::{
            Vec as StorageVec,
            HashMap as StorageHashMap,
        },
        traits::{
            PackedLayout,
            SpreadLayout
        },
    };

    pub const MAX_MINERALS: usize = 4;
    pub const STARTING_SHIP_COUNT: u32 = 50;
    pub const STARTING_MINERAL_COUNT: u32 = 1000;

    /// Holds the current leaderboard standing of a player
    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Default,
        Copy, Debug, Eq, PartialEq)]
    #[cfg_attr(
        feature = "std",
        derive(
            scale_info::TypeInfo,
            ink_storage::traits::StorageLayout
        )
    )]
    pub struct PlayerData {
        /// Number of wins
        ranked_wins: u32,
        /// Number of losses
        ranked_losses: u32,
    }

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Default, PartialEq, Eq, Debug, Copy)]
    #[cfg_attr(
        feature = "std",
        derive(
            scale_info::TypeInfo,
            ink_storage::traits::StorageLayout
        )
    )]
    pub struct RegisteredTrade {
        /// Amount to exchange
        amount: u32,
        /// Index of the mineral to exchange for
        exchange_for: u8,
    }

    #[ink(storage)]
    pub struct NewOmegaStorage {
        creator: AccountId,
        owners: StorageVec<AccountId>,
        players: StorageHashMap<AccountId, PlayerData>,
        minerals: StorageHashMap<AccountId, [u32; MAX_MINERALS]>,
        trades: StorageHashMap<AccountId, [RegisteredTrade; MAX_MINERALS]>,
        ships: StorageHashMap<AccountId, [u32; MAX_SHIPS]>,
    }

    impl NewOmegaStorage {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                players: StorageHashMap::default(),
                minerals: StorageHashMap::default(),
                trades: StorageHashMap::default(),
                ships: StorageHashMap::default(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new()
        }

        /// Authorises the Delegator contract to fire methods on this one.
        ///
        /// # Arguments
        ///
        /// * `delegator_address` - AccountId of the Delegator contract
        #[ink(message)]
        pub fn authorise_delegator(&mut self, delegator_address: AccountId) {
            assert!(self.creator == self.env().caller());
            self.owners.push(delegator_address);
        }

        /// Authorises the Ranked contract to fire methods on this one.
        ///
        /// # Arguments
        ///
        /// * `ranked_address` - AccountId of the Ranked contract
        #[ink(message)]
        pub fn authorise_ranked_contract(&mut self, ranked_address: AccountId) {
            assert!(self.creator == self.env().caller());
            self.owners.push(ranked_address);
        }

        /// Authorises the Universe contract to fire methods on this one.
        ///
        /// # Arguments
        ///
        /// * `universe_address` - AccountId of the Universe contract
        #[ink(message)]
        pub fn authorise_universe_contract(&mut self, universe_address: AccountId) {
            assert!(self.creator == self.env().caller());
            self.owners.push(universe_address);
        }

        /// Authorises the Industrial contract to fire methods on this one.
        ///
        /// # Arguments
        ///
        /// * `industrial_address` - AccountId of the Delegator contract
        #[ink(message)]
        pub fn authorise_industrial_contract(&mut self, industrial_address: AccountId) {
            assert!(self.creator == self.env().caller());
            self.owners.push(industrial_address);
        }

        /// Ensures that the player has a minerals entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        pub fn ensure_minerals_internal(&mut self, caller: AccountId) -> &mut [u32; MAX_MINERALS] {
            self.minerals
                .entry(caller)
                .or_insert([STARTING_MINERAL_COUNT; MAX_MINERALS])
        }

        /// Ensures that the player has a trades entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        pub fn ensure_trades_internal(&mut self, caller: AccountId) -> &mut [RegisteredTrade; MAX_MINERALS] {
            self.trades
                .entry(caller)
                .or_insert([RegisteredTrade::default(); MAX_MINERALS])
        }

        /// Ensures that the player has a ships entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        pub fn ensure_ships_internal(&mut self, caller: AccountId) -> &mut [u32; MAX_SHIPS] {
            self.ships
                .entry(caller)
                .or_insert([STARTING_SHIP_COUNT; MAX_SHIPS])
        }

        /// Ensures that the player has a minerals entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        #[ink(message)]
        pub fn ensure_minerals(&mut self, caller: AccountId) {
            self.ensure_minerals_internal(caller);
        }

        /// Ensures that the player has a trades entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        #[ink(message)]
        pub fn ensure_trades(&mut self, caller: AccountId) {
            self.ensure_trades_internal(caller);
        }

        /// Ensures that the player has a ships entry
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to ensure
        #[ink(message)]
        pub fn ensure_ships(&mut self, caller: AccountId) {
            self.ensure_ships_internal(caller);
        }

        /// Checks whether the player has enough ships
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to check ships of
        /// * `selection` - The ship selection to verify for the player
        ///
        /// # Returns
        ///
        /// * `has_enough` - A bool signifying whether the player has enough ships
        #[ink(message)]
        pub fn has_enough_ships(&self, caller: AccountId, selection: [u8; MAX_SHIPS]) -> bool {
            assert!(self.ships.get(&caller).is_some());
            let ships = self.ships.get(&caller).unwrap();
            let mut has_enough: bool = true;

            for i in 0..MAX_SHIPS {
                has_enough &= ships[i] >= selection[i] as u32;
            }

            has_enough
        }

        /// Adds minerals for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player
        /// * `amounts` - The amounts of minerals to add
        #[ink(message)]
        pub fn add_minerals(&mut self, caller: AccountId, amounts: [u32; MAX_MINERALS]) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let minerals = self.ensure_minerals_internal(caller);

            for i in 0..MAX_MINERALS {
                minerals[i] += amounts[i];
            }
        }

        /// Remove minerals from a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player
        /// * `amounts` - The amounts of minerals to remove
        #[ink(message)]
        pub fn remove_minerals(&mut self, caller: AccountId, amounts: [u32; MAX_MINERALS]) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let minerals = self.ensure_minerals_internal(caller);

            for i in 0..MAX_MINERALS {
                if minerals[i] < amounts[i] {
                    minerals[i] = 0;
                } else {
                    minerals[i] -= amounts[i];
                }
            }
        }

        /// Adds ships for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player
        /// * `amounts` - The amounts of ships to add
        #[ink(message)]
        pub fn add_ships(&mut self, caller: AccountId, amounts: [u32; MAX_SHIPS]) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let ships = self.ensure_ships_internal(caller);

            for i in 0..MAX_SHIPS {
                ships[i] += amounts[i];
            }
        }

        /// Removes ships from a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player
        /// * `amounts` - The amounts of ships to remove
        #[ink(message)]
        pub fn remove_ships(&mut self, caller: AccountId, amounts: [u32; MAX_SHIPS]) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let ships = self.ensure_ships_internal(caller);

            for i in 0..MAX_SHIPS {
                if ships[i] < amounts[i] {
                    ships[i] = 0;
                } else {
                    ships[i] -= amounts[i];
                }
            }
        }

        /// Returns how many ships a player has
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to check ships of
        ///
        /// # Returns
        ///
        /// * `ships` - A Selection of ships the player has
        #[ink(message)]
        pub fn get_player_ships(&self, caller: AccountId) -> [u32; MAX_SHIPS] {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let ships = self.ships.get(&caller);
            assert!(ships.is_some());
            *(ships.unwrap())
        }

        /// Returns how many minerals a player has
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to check minerals of
        ///
        /// # Returns
        ///
        /// * `ships` - A Selection of minerals the player has
        #[ink(message)]
        pub fn get_player_minerals(&self, caller: AccountId) -> [u32; MAX_MINERALS] {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let minerals = self.minerals.get(&caller);
            assert!(minerals.is_some());
            *(minerals.unwrap())
        }

        /// Returns open trades for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to check trades of
        ///
        /// # Returns
        ///
        /// * `ships` - A Selection of trades the player has open
        #[ink(message)]
        pub fn get_trades(&self, caller: AccountId) -> [RegisteredTrade; MAX_MINERALS] {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            assert!(self.trades.get(&caller).is_some());
            *(self.trades.get(&caller).unwrap())
        }

        /// Registers a trade for a player.
        /// A trade occurs between two players, and two resources, in a certain amount.
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player to register trade for
        /// * `resource_id` - Which resource to trade away (0..MAX_MINERALS)
        /// * `trade` - Trade structure containing which resource to trade for and in which amount
        #[ink(message)]
        pub fn register_trade(&mut self, caller: AccountId, resource_id: u8, trade: RegisteredTrade) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            let mut trades = self.ensure_trades_internal(caller);
            let resource_id_usize: usize = resource_id as usize;
            let old_amount = trades[resource_id_usize].amount;

            trades[resource_id_usize].exchange_for = trade.exchange_for;
            trades[resource_id_usize].amount = trade.amount;

            if trade.amount > old_amount {
                let delta = trade.amount - old_amount;
                let minerals = self.ensure_minerals_internal(caller);
                assert!(minerals[resource_id_usize] >= delta);
                minerals[resource_id_usize] -= delta;
            } else {
                let delta = old_amount - trade.amount;
                let minerals = self.ensure_minerals_internal(caller);
                minerals[resource_id_usize] += delta;
            }
        }

        /// Performs a trade.
        /// A trade occurs between two players, and two resources, in a certain amount.
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player initiating the trade
        /// * `target` - AccountId of the player to trade with
        /// * `resource_id` - Which resource to trade away (0..MAX_MINERALS)
        /// * `trade` - Trade structure containing which resource to trade for and in which amount
        #[ink(message)]
        pub fn trade(&mut self, caller: AccountId, target: AccountId, resource_id: u8, trade: RegisteredTrade) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            let mut target_trades = self.ensure_trades_internal(target);
            let resource_id_usize: usize = resource_id as usize;
            let exchange_for_usize: usize = trade.exchange_for as usize;

            assert!(target_trades[exchange_for_usize].amount >= trade.amount);
            assert!(target_trades[exchange_for_usize].exchange_for == resource_id);

            // TODO check if caller is allowed to trade with target by being connected to them

            target_trades[exchange_for_usize].amount -= trade.amount;

            let minerals_caller = self.ensure_minerals_internal(caller);
            assert!(minerals_caller[resource_id_usize] >= trade.amount);
            minerals_caller[exchange_for_usize] += trade.amount;
            minerals_caller[resource_id_usize] -= trade.amount;

            let minerals_target = self.ensure_minerals_internal(target);
            minerals_target[resource_id_usize] += trade.amount;
        }

        /// Ensures that a player data structure is defined.
        /// Inserts the default if it is not.
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to ensure data for
        fn ensure_player(&mut self, caller: AccountId) -> &mut PlayerData {
            self.players
                .entry(caller)
                .or_insert(PlayerData::default())
        }

        /// Marks a ranked win for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to mark
        #[ink(message)]
        pub fn mark_ranked_win(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let player_data = self.ensure_player(caller);
            player_data.ranked_wins = player_data.ranked_wins + 1;
        }

        /// Marks a ranked loss for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to mark
        #[ink(message)]
        pub fn mark_ranked_loss(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            let player_data = self.ensure_player(caller);
            player_data.ranked_losses = player_data.ranked_losses + 1;
        }

        /// Gets the current ranked leaderboard.
        ///
        /// # Returns
        ///
        /// * `leaderboard` - A Vec containing a tuple of (player account id, player data)
        #[ink(message)]
        pub fn get_leaderboard(&self) -> Vec<(AccountId, PlayerData)> {
            self.players
                .iter()
                .filter_map(|entry| {
                    let (&key, &value) = entry;
                    Some((key, value))
                })
                .collect()
        }

        /// Gets caller's standing in the ranked leaderboard.
        ///
        /// # Returns
        ///
        /// * `ranked_entry` - A PlayerData structure with the leaderboard entry
        #[ink(message)]
        pub fn get_own_standing(&self, caller: AccountId) -> PlayerData {
            assert!(self.players.get(&caller).is_some());
            *(self.players.get(&caller).unwrap())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink_env::{
            test,
        };
        use ink_lang as ink;
        type Accounts = test::DefaultAccounts<Environment>;

        fn default_accounts() -> Accounts {
            test::default_accounts()
                .expect("Test environment is expected to be initialized.")
        }

        #[ink::test]
        fn test_ranked_marking() {
            let mut contract = NewOmegaStorage::default();
            let accounts = default_accounts();

            contract.mark_ranked_win(accounts.alice);
            contract.mark_ranked_loss(accounts.bob);

            let leaderboard: Vec<(AccountId, PlayerData)> = contract.get_leaderboard();

            assert_eq!(leaderboard.len(), 2);
            assert_eq!(leaderboard[0].1.ranked_wins, 1);
            assert_eq!(leaderboard[0].1.ranked_losses, 0);
            assert_eq!(leaderboard[1].1.ranked_wins, 0);
            assert_eq!(leaderboard[1].1.ranked_losses, 1);
        }

        #[ink::test]
        fn test_minerals() {
            let mut contract = NewOmegaStorage::default();
            let accounts = default_accounts();

            contract.add_minerals(accounts.alice, [10, 11, 12, 13]);
            let minerals = contract.get_player_minerals(accounts.alice);

            assert_eq!(minerals[0], STARTING_MINERAL_COUNT + 10);
            assert_eq!(minerals[1], STARTING_MINERAL_COUNT + 11);
            assert_eq!(minerals[2], STARTING_MINERAL_COUNT + 12);
            assert_eq!(minerals[3], STARTING_MINERAL_COUNT + 13);

            contract.remove_minerals(accounts.alice, [4, 5, 6, 7]);
            let minerals_post_remove = contract.get_player_minerals(accounts.alice);

            assert_eq!(minerals_post_remove[0], STARTING_MINERAL_COUNT + 10 - 4);
            assert_eq!(minerals_post_remove[1], STARTING_MINERAL_COUNT + 11 - 5);
            assert_eq!(minerals_post_remove[2], STARTING_MINERAL_COUNT + 12 - 6);
            assert_eq!(minerals_post_remove[3], STARTING_MINERAL_COUNT + 13 - 7);
        }

        #[ink::test]
        fn test_ships() {
            let mut contract = NewOmegaStorage::default();
            let accounts = default_accounts();

            contract.add_ships(accounts.alice, [10, 11, 12, 13]);
            let minerals = contract.get_player_ships(accounts.alice);

            assert_eq!(minerals[0], STARTING_SHIP_COUNT + 10);
            assert_eq!(minerals[1], STARTING_SHIP_COUNT + 11);
            assert_eq!(minerals[2], STARTING_SHIP_COUNT + 12);
            assert_eq!(minerals[3], STARTING_SHIP_COUNT + 13);

            contract.remove_ships(accounts.alice, [4, 5, 6, 7]);
            let ships_post_remove = contract.get_player_ships(accounts.alice);

            assert_eq!(ships_post_remove[0], STARTING_SHIP_COUNT + 10 - 4);
            assert_eq!(ships_post_remove[1], STARTING_SHIP_COUNT + 11 - 5);
            assert_eq!(ships_post_remove[2], STARTING_SHIP_COUNT + 12 - 6);
            assert_eq!(ships_post_remove[3], STARTING_SHIP_COUNT + 13 - 7);

            assert!(contract.has_enough_ships(accounts.alice, [1, 1, 1, 1]));
        }

        #[ink::test]
        fn test_trade() {
            let mut contract = NewOmegaStorage::default();
            let accounts = default_accounts();

            contract.add_minerals(accounts.alice, [0, 10, 0, 0]);
            let minerals_alice_before = contract.get_player_minerals(accounts.alice);
            assert_eq!(minerals_alice_before[1], STARTING_MINERAL_COUNT + 10);

            contract.add_minerals(accounts.bob, [0, 0, 10, 0]);

            contract.register_trade(accounts.alice, 1, RegisteredTrade {
                exchange_for: 2,
                amount: 6,
            });
            let minerals_alice_middle = contract.get_player_minerals(accounts.alice);
            assert_eq!(minerals_alice_middle[1], STARTING_MINERAL_COUNT + 4);

            contract.trade(accounts.bob, accounts.alice, 2, RegisteredTrade {
                exchange_for: 1,
                amount: 3,
            });

            let minerals_alice = contract.get_player_minerals(accounts.alice);
            assert_eq!(minerals_alice[1], STARTING_MINERAL_COUNT + 4);
            assert_eq!(minerals_alice[2], STARTING_MINERAL_COUNT + 3);
            
            let minerals_bob = contract.get_player_minerals(accounts.bob);
            assert_eq!(minerals_bob[1], STARTING_MINERAL_COUNT + 3);
            assert_eq!(minerals_bob[2], STARTING_MINERAL_COUNT + 7);
        }

        #[ink::test]
        fn test_ensures() {
            let mut contract = NewOmegaStorage::default();
            let accounts = default_accounts();

            assert!(contract.minerals.get(&accounts.alice).is_none());
            assert!(contract.trades.get(&accounts.alice).is_none());
            assert!(contract.ships.get(&accounts.alice).is_none());

            contract.ensure_minerals(accounts.alice);
            contract.ensure_trades(accounts.alice);
            contract.ensure_ships(accounts.alice);

            assert!(contract.minerals.get(&accounts.alice).is_some());
            assert!(contract.trades.get(&accounts.alice).is_some());
            assert!(contract.ships.get(&accounts.alice).is_some());
        }
    }
}
