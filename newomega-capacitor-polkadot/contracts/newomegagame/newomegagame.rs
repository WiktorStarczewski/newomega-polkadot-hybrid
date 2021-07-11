#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegagame::NewOmegaGame;

/// Wraps the Game Engine with a bit of storage, which contains the definition of
/// ships (their statistics). The allows for separation of the Engine logic from ships,
/// which is useful because it allows the Engine to remain pure.
#[ink::contract]
mod newomegagame {
    use newomega::NewOmega;
    use newomega::Ship;
    use newomega::MAX_SHIPS;
    use newomega::FightResult;
    use newomega::Move;
    use newomega::ShipModule;
    use newomega::TargetingType;
    use ink_prelude::vec::Vec;

    #[ink(storage)]
    pub struct NewOmegaGame {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega: NewOmega,
        ships: Vec<Ship>,
    }

    impl NewOmegaGame {
        #[ink(constructor)]
        pub fn new(new_omega: NewOmega) -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega,
                ships: newomega::prepare_ships(),
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

        /// Adds ship to the ship definitions
        ///
        /// # Arguments
        ///
        /// * `cp` - Ship Command Power
        /// * `hp` - Ship Health Points
        /// * `attack_base` - Base attack
        /// * `attack_variable` - Variable attack (subject to random)
        /// * `defence` - Ship Defence
        /// * `speed` - Ship Speed
        /// * `range` - Ship Range
        #[ink(message)]
        pub fn add_ship(&mut self, cp: u16, hp: u16, attack_base: u16, attack_variable: u16,
            defence: u16, speed: u8, range: u8) {

            assert_eq!(self.env().caller(), self.owner.unwrap());
            self.ships.push(Ship {
                cp,
                hp,
                attack_base,
                attack_variable,
                defence,
                speed,
                range,
            });
        }

        /// Returns all the registered ships
        ///
        /// # Returns
        ///
        /// * `ships` - A Vector containing the registered ships
        #[ink(message)]
        pub fn get_ships(&self) -> Vec<Ship> {
            self.ships.clone()
        }

        /// Calculates a fight, using registered ships.
        ///
        /// # Arguments
        ///
        /// * `seed` - Seed used to generate randomness
        /// * `log_moves` - Whether to return a detailed fight log
        /// * `selection_lhs` - Attacker fleet composition (array with ship quantities)
        /// * `selection_rhs` - Defender fleet composition (array with ship quantities)
        /// * `modules_lhs` - An array that holds modules of the attacker fleet
        /// * `modules_rhs` - An array that holds modules of the defender fleet
        ///
        /// # Returns
        ///
        /// * `result` - A FightResult structure containing the result
        /// * `moves_lhs` - Logged moves of the attacker, if requested. None if not.
        /// * `moves_rhs` - Logged moves of the defender, if requested. None if not.
        #[ink(message)]
        pub fn fight(&self, seed: u64, log_moves: bool, selection_lhs: [u8; MAX_SHIPS],
            selection_rhs: [u8; MAX_SHIPS], modules_lhs: [ShipModule; MAX_SHIPS],
            modules_rhs: [ShipModule; MAX_SHIPS], targeting_lhs: TargetingType,
            targeting_rhs: TargetingType) -> (FightResult, Option<Vec<Move>>,
                Option<Vec<Move>>) {

            self.new_omega.fight(seed, log_moves, self.get_ships(),
                selection_lhs, selection_rhs, modules_lhs, modules_rhs,
                targeting_lhs, targeting_rhs)
        }
    }
}
