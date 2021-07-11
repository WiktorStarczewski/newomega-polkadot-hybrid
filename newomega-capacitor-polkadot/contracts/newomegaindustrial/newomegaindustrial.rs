#![feature(destructuring_assignment)]
#![feature(map_into_keys_values)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegaindustrial::NewOmegaIndustrial;

#[ink::contract]
mod newomegaindustrial {
    use newomega::MAX_SHIPS;
    use newomega::Ship;
    use newomegastorage::NewOmegaStorage;
    use newomegastorage::MAX_MINERALS;
    use newomegagame::NewOmegaGame;
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

    pub const SHIP_COST_PER_CP: u32 = 10;

    #[ink(storage)]
    pub struct NewOmegaIndustrial {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega_game: Option<newomegagame::NewOmegaGame>,
        new_omega_storage: Option<newomegastorage::NewOmegaStorage>,
    }

    impl NewOmegaIndustrial {
        #[ink(constructor)]
        pub fn new(new_omega_game: NewOmegaGame, new_omega_storage: NewOmegaStorage) -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: Some(new_omega_game),
                new_omega_storage: Some(new_omega_storage),
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

        /// Produces a given amount of a certain ship for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - Account id of the player to produce ships for
        /// * `ship_id` - Which ship to produce (0..MAX_SHIPS)
        /// * `amount` - How many ships to produce
        #[ink(message)]
        pub fn produce_ships(&mut self, caller: AccountId, ship_id: u8, amount: u32) {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            let ship_id_usize: usize = ship_id as usize;
            let minerals = self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .get_player_minerals(caller);

            let ships: Vec<Ship> = self   
                .new_omega_game
                .as_ref()
                .unwrap()
                .get_ships();

            let cost_per_ship: u32 = (ships[ship_id_usize].cp as u32) * SHIP_COST_PER_CP;
            let total_cost: u32 = amount * cost_per_ship;

            assert!(minerals[ship_id_usize] >= total_cost);

            let mut costs: [u32; MAX_MINERALS] = [0; MAX_MINERALS];
            costs[ship_id_usize] = total_cost;

            let mut requested_ships: [u32; MAX_SHIPS] = [0; MAX_SHIPS];
            requested_ships[ship_id_usize] = amount;

            self
                .new_omega_storage
                .as_mut()
                .unwrap()
                .remove_minerals(caller, costs);

            self
                .new_omega_storage
                .as_mut()
                .unwrap()
                .add_ships(caller, requested_ships);
        }
    }
}