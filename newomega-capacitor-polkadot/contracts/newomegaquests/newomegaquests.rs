#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegaquests::NewOmegaQuests;
pub use self::newomegaquests::QuestProgress;

#[ink::contract]
mod newomegaquests {
    use ink_prelude::vec::Vec;
    use ink_prelude::vec;
    use ink_prelude::string::String;
    use ink_storage::{
        collections::{
            HashMap as StorageHashMap,
            Vec as StorageVec,
        },
        traits::{
            PackedLayout,
            SpreadLayout
        },
    };

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Default, Copy)]
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
    pub struct QuestProgress {
        planet_capture: u8,
        ranked_wins: u8,
        module_craft: u8,
        planet_harvest: u8,
        produce_ships: u8,
        discover: u8,
        build_gateway: u8,
        register_mineral_trade: u8,
        upgrade_planet: u8,
    }

    pub const PROGRESS_NEEEDED: QuestProgress = QuestProgress {
        planet_capture: 5,
        ranked_wins: 5,
        module_craft: 1,
        planet_harvest: 5,
        produce_ships: 4,
        discover: 3,
        build_gateway: 1,
        register_mineral_trade: 1,
        upgrade_planet: 1,
    };

    #[ink(storage)]
    pub struct NewOmegaQuests {
        creator: AccountId,
        owners: StorageVec<AccountId>,
        progress: StorageHashMap<AccountId, QuestProgress>,
    }

    impl NewOmegaQuests {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                progress: StorageHashMap::default(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                progress: StorageHashMap::default(),
            }
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

        pub fn ensure_progress(&mut self, caller: AccountId) {
            if self.progress.get(&caller).is_none() {
                self.progress.insert(caller, QuestProgress::default());
            }
        }

        #[ink(message)]
        pub fn get_player_progress(&self, caller: AccountId) -> QuestProgress {
            if self.progress.get(&caller).is_some() {
                return *self.progress.get(&caller).unwrap();
            } else {
                return QuestProgress::default();
            }
        }

        #[ink(message)]
        pub fn claim_quest(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let caller_progress = self.progress.get(&caller).unwrap();

            assert!(caller_progress.planet_capture >= PROGRESS_NEEEDED.planet_capture &&
                caller_progress.ranked_wins >= PROGRESS_NEEEDED.ranked_wins && 
                caller_progress.module_craft >= PROGRESS_NEEEDED.module_craft && 
                caller_progress.planet_harvest >= PROGRESS_NEEEDED.planet_harvest && 
                caller_progress.produce_ships >= PROGRESS_NEEEDED.produce_ships && 
                caller_progress.discover >= PROGRESS_NEEEDED.discover && 
                caller_progress.build_gateway >= PROGRESS_NEEEDED.build_gateway &&
                caller_progress.register_mineral_trade >= PROGRESS_NEEEDED.register_mineral_trade &&
                caller_progress.upgrade_planet >= PROGRESS_NEEEDED.upgrade_planet);
                
            self.progress.insert(caller, QuestProgress::default());
        }

        #[ink(message)]
        pub fn mark_planet_capture(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.planet_capture < u8::MAX {
                caller_progress.planet_capture += 1
            }
        }

        #[ink(message)]
        pub fn mark_ranked_win(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.ranked_wins < u8::MAX {
                caller_progress.ranked_wins += 1
            }
        }

        #[ink(message)]
        pub fn mark_module_craft(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.module_craft < u8::MAX {
                caller_progress.module_craft += 1
            }
        }

        #[ink(message)]
        pub fn mark_planet_harvest(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.planet_harvest < u8::MAX {
                caller_progress.planet_harvest += 1
            }
        }

        #[ink(message)]
        pub fn mark_produce_ships(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.produce_ships < u8::MAX {
                caller_progress.produce_ships += 1
            }
        }

        #[ink(message)]
        pub fn mark_discover(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.discover < u8::MAX {
                caller_progress.discover += 1
            }
        }

        #[ink(message)]
        pub fn mark_build_gateway(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.build_gateway < u8::MAX {
                caller_progress.build_gateway += 1
            }
        }

        #[ink(message)]
        pub fn mark_register_mineral_trade(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.register_mineral_trade < u8::MAX {
                caller_progress.register_mineral_trade += 1
            }
        }

        #[ink(message)]
        pub fn mark_upgrade_planet(&mut self, caller: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.ensure_progress(caller);
            let mut caller_progress = self.progress.get_mut(&caller).unwrap();
            if caller_progress.upgrade_planet < u8::MAX {
                caller_progress.upgrade_planet += 1
            }
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
        fn test_marking() {
            let mut contract = NewOmegaQuests::default();
            let accounts = default_accounts();

            for _i in 0..PROGRESS_NEEEDED.planet_capture {
                contract.mark_planet_capture(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.ranked_wins {
                contract.mark_ranked_win(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.module_craft {
                contract.mark_module_craft(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.planet_harvest {
                contract.mark_planet_harvest(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.produce_ships {    
                contract.mark_produce_ships(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.discover {
                contract.mark_discover(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.build_gateway {
                contract.mark_build_gateway(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.register_mineral_trade {
                contract.mark_register_mineral_trade(accounts.alice);
            }

            for _i in 0..PROGRESS_NEEEDED.upgrade_planet {
                contract.mark_upgrade_planet(accounts.alice);
            }

            let progress = contract.get_player_progress(accounts.alice);
            assert_eq!(progress, PROGRESS_NEEEDED);

            contract.claim_quest(accounts.alice);

            let progress_after_claim = contract.get_player_progress(accounts.alice);
            assert_eq!(progress_after_claim, QuestProgress::default());
        }
    }
}