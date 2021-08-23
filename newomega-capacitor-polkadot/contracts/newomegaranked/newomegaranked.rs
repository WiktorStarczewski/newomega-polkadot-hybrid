#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegaranked::NewOmegaRanked;
pub use self::newomegaranked::PlayerDefence;

/// The logic for all ranked fights between players. Connected to Fight Management
/// in order to run fights, and to Storage in order to save the results and perform
/// actions according to their result.
#[ink::contract]
mod newomegaranked {
    use newomegagame::NewOmegaGame;
    use newomegastorage::NewOmegaStorage;
    use newomega::MAX_SHIPS;
    use newomega::FightResult;
    use newomega::ShipModule;
    use newomega::TargetingType;
    use newomegatokens::TokenId;
    use ink_prelude::vec::Vec;
    use ink_prelude::string::String;
    use ink_storage::{
        collections::{
            HashMap as StorageHashMap,
        },
        traits::{
            PackedLayout,
            SpreadLayout,
        },
    };
    use byteorder::{ByteOrder, LittleEndian};

    const XP_PER_RANKED_WIN: u32 = 1;

    /// Describes a registered defence of a player
    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone)]
    #[cfg_attr(
        feature = "std",
        derive(
            Debug,
            PartialEq,
            Eq,
            scale_info::TypeInfo,
            ink_storage::traits::StorageLayout
        )
    )]
    pub struct PlayerDefence {
        /// Fleet composition
        selection: [u8; MAX_SHIPS],
        /// Fleet modules
        modules: [Option<TokenId>; MAX_SHIPS],
        /// Targeting
        targeting: TargetingType,
        /// Defender name
        name: String,
        /// Balance
        value: Balance,
        /// Wins
        wins: u32,
        /// Losses
        losses: u32,
    }

    #[ink(storage)]
    pub struct NewOmegaRanked {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega_game: Option<newomegagame::NewOmegaGame>,
        new_omega_storage: Option<newomegastorage::NewOmegaStorage>,
        defences: StorageHashMap<AccountId, PlayerDefence>,
    }

    impl NewOmegaRanked {
        #[ink(constructor)]
        pub fn new(new_omega_game: NewOmegaGame, new_omega_storage: NewOmegaStorage) -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: Some(new_omega_game),
                new_omega_storage: Some(new_omega_storage),
                defences: StorageHashMap::default(),
            }
        }

        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: None,
                new_omega_storage: None,
                defences: StorageHashMap::default(),
            }
        }

        /// Authorises the Delegator contract to fire methods on this one.
        ///
        /// # Arguments
        ///
        /// * `delegator_address` - AccountId of the Delegator contract
        #[ink(message)]
        pub fn authorise_delegator(&mut self, delegator_address: AccountId) {
            assert_eq!(self.env().caller(), self.creator);
            self.owner = Some(delegator_address);
        }

        /// Registers a fleet for Ranked Defence.
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to register the defence for
        /// * `selection` - The fleet composition of the defence
        /// * `modules` - The modules of the defence
        /// * `name` - The defender name
        #[ink(message)]
        pub fn register_defence(&mut self, caller: AccountId, selection: [u8; MAX_SHIPS],
            modules: [Option<TokenId>; MAX_SHIPS], name: String, value: Balance, targeting: TargetingType) {

            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.defences.get(&caller).is_none());

            self.defences.insert(caller, PlayerDefence {
                selection,
                modules,
                name,
                value,
                targeting,
                wins: 0,
                losses: 0,
            });
        }

        /// Unregisters a fleet for Ranked Defence.
        /// Returns the balance of the Defence, so it can be transferred back to caller.
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to register the defence for
        #[ink(message)]
        pub fn unregister_defence(&mut self, caller: AccountId) -> Balance {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.defences.get(&caller).is_some());

            let defence: &PlayerDefence = self.defences.get_mut(&caller).unwrap();
            let defence_balance: Balance = defence.value;

            self.defences.take(&caller);

            defence_balance
        }

        /// Gets the registered defence of a player.
        /// Will panic if defence has not been registered for the player.
        ///
        /// # Arguments
        ///
        /// * `caller` - The account id of the player to register the defence for
        ///
        /// # Returns
        ///
        /// * `defence` - The registered defence
        #[ink(message)]
        pub fn get_own_defence(&self, caller: AccountId) -> PlayerDefence {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.defences.get(&caller).is_some());

            let defence: &PlayerDefence = self.defences.get(&caller).unwrap();

            PlayerDefence {
                selection: defence.selection,
                modules: defence.modules,
                name: defence.name.clone(),
                value: defence.value,
                wins: defence.wins,
                losses: defence.losses,
                targeting: defence.targeting,
            }
        }

        /// Gets all the registered defenders (all players).
        ///
        /// # Returns
        ///
        /// * `defenders` - The registered defenders
        #[ink(message)]
        pub fn get_all_defenders(&self) -> Vec<(AccountId, PlayerDefence)> {
            self.defences
                .iter()
                .filter_map(|entry| {
                    let (&key, value) = entry;
                    Some((key, value.clone()))
                })
                .collect()
        }

        fn min(&self, lhs: Balance, rhs: Balance) -> Balance {
            if lhs < rhs {
                lhs
            } else {
                rhs
            }
        }

        fn get_defence(&self, account: AccountId) -> &PlayerDefence {
            assert!(self.defences.get(&account).is_some());
            self.defences.get(&account).unwrap()
        }

        /// Generates a random seed
        ///
        /// # Returns
        ///
        /// * `u64` - The random seed
        pub fn generate_random_seed(&self, sub_seed: u8) -> u64 {
            let (hash, block_number) = self.env().random(&[sub_seed]);
            LittleEndian::read_u64(hash.as_ref())
        }

        /// Calculates a ranked fight between two players.
        ///
        /// # Arguments
        ///
        /// * `caller` - account id of the attacker
        /// * `target` - account id of the defender
        /// * `selection` - Attacker fleet composition (array with ship quantities)
        /// * `modules` - An array that holds modules of the attacker fleet
        #[ink(message)]
        pub fn attack(&mut self, caller: AccountId, target: AccountId, selection: [u8; MAX_SHIPS],
            modules: [Option<TokenId>; MAX_SHIPS], value: Balance, targeting: TargetingType) -> (FightResult, Balance) {

            assert_eq!(self.env().caller(), self.owner.unwrap());
            // Try to get the defence
            let target_defence: PlayerDefence = self.get_defence(target).clone();
            // Determine the seed, in a naive way -> IMPROVEME: MOVE TO VRF
            let seed: u64 = self.generate_random_seed(1);

            let modules_decode = self.new_omega_storage
                .as_ref()
                .unwrap()
                .decode_modules(caller, modules);
            let target_modules_decode = self.new_omega_storage
                .as_ref()
                .unwrap()
                .decode_modules(target, target_defence.modules);

            // Calculate the fight result
            let (result, _lhs_moves, _rhs_moves) =
                self.new_omega_game
                    .as_ref()
                    .unwrap()
                    .fight(
                        seed,
                        false,
                        selection,
                        target_defence.selection,
                        modules_decode,
                        target_modules_decode,
                        targeting,
                        target_defence.targeting);

            let mut payout: Balance = self.min(value, target_defence.value);

            if result.lhs_dead {
                self.new_omega_storage.as_mut().unwrap().mark_ranked_win(target);
                self.new_omega_storage.as_mut().unwrap().mark_ranked_loss(caller);

                let target_defence_mut = &mut self.defences.get_mut(&target).unwrap();
                target_defence_mut.value += payout;
                target_defence_mut.wins += 1;
            } else if result.rhs_dead {
                self.new_omega_storage.as_mut().unwrap().mark_ranked_win(caller);
                self.new_omega_storage.as_mut().unwrap().mark_ranked_loss(target);
                payout = payout / 2;

                let target_defence_mut = &mut self.defences.get_mut(&target).unwrap();
                target_defence_mut.value -= payout;
                target_defence_mut.losses += 1;

                let caller_defence_mut = &mut self.defences.get_mut(&caller).unwrap();
                caller_defence_mut.value += payout;
            }

            (result, payout)
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
        fn test_registering() {
            let mut contract = NewOmegaRanked::default();
            let accounts = default_accounts();

            let selection: [u8; MAX_SHIPS] = [10; MAX_SHIPS];
            let modules: [Option<TokenId>; MAX_SHIPS] = [None; MAX_SHIPS];
            let name = &String::from("Alice");
            let value: Balance = 1000000;
            let targeting = TargetingType::Closest;

            contract.register_defence(accounts.alice, selection, modules, name.to_string(), value, targeting);

            let defence = contract.get_own_defence(accounts.alice);
            assert_eq!(defence.selection, selection);
            assert_eq!(defence.modules, modules);
            assert_eq!(defence.name, name.to_string());
            assert_eq!(defence.value, value);
            assert_eq!(defence.targeting, targeting);

            let all_defenders = contract.get_all_defenders();
            assert_eq!(all_defenders.len(), 1);

            contract.unregister_defence(accounts.alice);

            let all_defenders_after_unreg = contract.get_all_defenders();
            assert_eq!(all_defenders_after_unreg.len(), 0);
        }
    }
}
