#![feature(destructuring_assignment)]
#![feature(stmt_expr_attributes)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomega::NewOmega;
pub use self::newomega::Ship;
pub use self::newomega::Move;
pub use self::newomega::FightResult;
pub use self::newomega::MAX_SHIPS;
pub use self::newomega::prepare_ships;
pub use self::newomega::ShipModule;
pub use self::newomega::TargetingType;
pub use self::newomega::RunningEffect;

/// This contract has no storage, and all its methods are pure (stateless).
/// It is able to simulate fights, given a set of input parameters,
/// for which it always gives a deterministic result.
/// This implies, that the exact fight (moves of the players), can be always
/// regenerated provided the same set of input parameters (fleet selection).
/// In fact, it is possible not to store (and return) the fight at all,
/// only its result, via a boolean flag.
/// This is used in order to save cost - precise fight generation can be recreated using (free)
/// RPC calls, not paid transactions.
#[ink::contract]
mod newomega {
    #[ink(storage)]
    pub struct NewOmega {}

    pub const MAX_SHIPS: usize = 4;
    const MAX_ROUNDS: usize = 50;

    use ink_prelude::vec::Vec;
    use ink_storage::{
        traits::{
            PackedLayout,
            SpreadLayout,
        },
    };

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Copy, Clone)]
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
    pub enum TargetingType {
        Furthest,
        Closest,
        HighestHp,
        LowestHp,
        HighestSpeed,
        LowestSpeed,
        HighestDefence,
        LowestDefence,
        HighestAttack,
        LowestAttack
    }

    impl Default for TargetingType {
        fn default() -> Self { TargetingType::Furthest }
    }

    /// Describes a single move in a fight.
    /// A move can be pure reposition, shoot, or reposition with shoot.
    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Copy, Clone)]
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
    pub struct Move {
        /// Shoot, Reposition
        move_type: u8,
        /// Round the move took place in
        round: u8,
        /// Source ship id
        source: u8,
        /// Target ship id, in the case of shoot
        target: u8,
        /// Position to move to, if needed
        target_position: i16,
        /// Damage of the shot, if needed
        damage: u32,
        /// Effects running on the attacker
        effects_lhs: [RunningEffect; MAX_SHIPS],
        /// Effects running on the defender
        effects_rhs: [RunningEffect; MAX_SHIPS],
    }

    /// Describes a ship module definition
    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Copy, Clone, Default)]
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
    pub struct ShipModule {
        /// Power of the snare effect
        snare: u8,
        /// Power of the root effect
        root: u8,
        /// Power of the blind effect
        blind: u8,
        /// Power of the attack debuff effect
        attack_debuff: u8,
        /// Power of the defence debuff effect
        defence_debuff: u8,
        /// Power of the range debuff effect
        range_debuff: u8,
    }

    /// Describes a single Ship on the board
    /// A move can be pure reposition, shoot, or reposition with shoot.
    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Copy, Clone)]
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
    pub struct Ship {
        /// Command Power (to calculate fleet weights)
        pub cp: u16,
        /// Health Points of the ship
        pub hp: u16,
        /// Base attack
        pub attack_base: u16,
        /// Variable attack (subject to random)
        pub attack_variable: u16,
        /// Defence of the ship
        pub defence: u16,
        /// Speed, number of fields the ship can move in a round
        pub speed: u8,
        /// Range, number of fields in front of it the ship can shoot to in a round
        pub range: u8
    }

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout)]
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
    pub struct FightResult {
        /// Attacker fleet composition
        selection_lhs: [u8; MAX_SHIPS],
        /// Defencer fleet composition
        selection_rhs: [u8; MAX_SHIPS],
        /// Attacker ship modules
        modules_lhs: [ShipModule; MAX_SHIPS],
        /// Defender ship modules
        modules_rhs: [ShipModule; MAX_SHIPS],
        /// Attacker targeting
        targeting_lhs: TargetingType,
        /// Defender targeting
        targeting_rhs: TargetingType,
        /// Did the attacker die?
        pub lhs_dead: bool,
        /// Did the defender die?
        pub rhs_dead: bool,
        /// Length of the fight in rounds
        rounds: u8,
        /// Random seed the fight was generated with
        seed: u64,
        /// Attackers ships lost
        pub ships_lost_lhs: [u8; MAX_SHIPS],
        /// Defenders ships lost
        pub ships_lost_rhs: [u8; MAX_SHIPS],
    }

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Copy, Default)]
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
    pub struct RunningEffect {
        /// Number of rounds left on the snare effect
        snare: u8,
        /// Number of rounds left on the root effect
        root: u8,
        /// Number of rounds left on the blind effect
        blind: u8,
        /// Number of rounds left on the attack debuff effect
        attack_debuff: u8,
        /// Number of rounds left on the defence debuff effect
        defence_debuff: u8,
        /// Number of rounds left on the range debuff effect
        range_debuff: u8,
    }

    pub fn prepare_ships() -> Vec<Ship> {
        let mut ships: Vec<Ship> = Vec::new();

        // Initialize default ships
        ships.push(Ship {
            cp: 1,
            hp: 120,
            attack_base: 80,
            attack_variable: 20,
            defence: 20,
            speed: 4,
            range: 4,
        });
        ships.push(Ship {
            cp: 3,
            hp: 150,
            attack_base: 65,
            attack_variable: 20,
            defence: 30,
            speed: 3,
            range: 8,
        });
        ships.push(Ship {
            cp: 4,
            hp: 220,
            attack_base: 65,
            attack_variable: 20,
            defence: 35,
            speed: 2,
            range: 15,
        });
        ships.push(Ship {
            cp: 10,
            hp: 450,
            attack_base: 80,
            attack_variable: 20,
            defence: 40,
            speed: 1,
            range: 30,
        });

        ships
    }

    impl NewOmega {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self { }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self::new()
        }

        /// Return minimum of two i32 values
        fn min(&self, lhs: i32, rhs: i32) -> i32 {
            let result: i32;

            if lhs > rhs {
                result = rhs;
            } else {
                result = lhs;
            }

            result
        }

        /// Return maximum of two i32 values
        fn max(&self, lhs: i32, rhs: i32) -> i32 {
            let result: i32;

            if lhs > rhs {
                result = lhs;
            } else {
                result = rhs;
            }

            result
        }

        /// Checks whether player is dead, according to their ship hp's
        ///
        /// # Arguments
        ///
        /// * `ship_hps` - An array of fleet HPs of the player
        ///
        /// # Returns
        ///
        /// * `is_dead` - Whether the player fleet is dead
        fn is_dead(&self, ship_hps: [i32; MAX_SHIPS]) -> bool {
            let mut is_target_dead: bool = true;

            for i in 0..MAX_SHIPS {
                if ship_hps[i] > 0 {
                    is_target_dead = false;
                }
            }

            is_target_dead
        }

        /// Gets the defence stat of a ship, possibly modified by the effect
        ///
        /// # Arguments
        ///
        /// * `stat` - Base ship statistic to modify
        /// * `effect` - The running effect
        ///
        /// # Returns
        ///
        /// * `final_stat` - The modified defence stat
        fn get_defence_stat(&self, stat: u16, effect: &RunningEffect) -> u16 {
            if effect.defence_debuff > 0 {
                stat / 2
            } else {
                stat
            }
        }

        /// Gets the attack stat of a ship, possibly modified by the effect
        ///
        /// # Arguments
        ///
        /// * `stat` - Base ship statistic to modify
        /// * `effect` - The running effect
        ///
        /// # Returns
        ///
        /// * `final_stat` - The modified attack stat
        fn get_attack_stat(&self, stat: u16, effect: &RunningEffect) -> u16 {
            if effect.attack_debuff > 0 {
                stat / 2
            } else {
                stat
            }
        }

        /// Gets the range stat of a ship, possibly modified by the effect
        ///
        /// # Arguments
        ///
        /// * `stat` - Base ship statistic to modify
        /// * `effect` - The running effect
        ///
        /// # Returns
        ///
        /// * `final_stat` - The modified defence stat
        fn get_range_stat(&self, stat: u8, effect: &RunningEffect) -> u8 {
            if effect.range_debuff > 0 {
                stat / 2
            } else {
                stat
            }
        }

        /// Gets the speed stat of a ship, possibly modified by the effect
        ///
        /// # Arguments
        ///
        /// * `stat` - Base ship statistic to modify
        /// * `effect` - The running effect
        ///
        /// # Returns
        ///
        /// * `final_stat` - The modified defence stat
        fn get_speed_stat(&self, stat: u8, effect: &RunningEffect) -> u8 {
            if effect.root > 0 {
                0
            } else if effect.blind > 0 {
                0
            } else if effect.snare > 0 {
                stat / 2
            } else {
                stat
            }
        }

        /// Picks a target for a ship.
        ///
        /// # Arguments
        ///
        /// * `ships` - A Vec that holds the definiton of all the ships
        /// * `current_ship` - Index of the ship to pick target for
        /// * `ship_positions_own` - An array of fleet positions of the player performing the move
        /// * `ship_positions_enemy` - An array of fleet positions of the player NOT performing the move
        /// * `ship_hps_own` - An array of fleet HPs of the player performing the move
        /// * `ship_hps_enemy` - An array of fleet HPs of the player NOT performing the move
        ///
        /// # Returns
        ///
        /// * `has_target` - A bool, indicating whether a target has been found
        /// * `target` - Target ship identifier
        /// * `proposed_move` - The new source ship position (can be unchanged)
        ///
        /// # Algorithm rules:
        ///     To be considered in range, target ship must be within range+speed from source ship
        ///     Targets are picked according to their size, ie bigger ships first
        fn get_target(&self,
            ships: &Vec<Ship>,
            current_ship: u8,
            ship_positions_own: [i16; MAX_SHIPS],
            ship_positions_enemy: [i16; MAX_SHIPS],
            ship_hps_enemy: [i32; MAX_SHIPS],
            effects_own: &[RunningEffect; MAX_SHIPS],
            effects_enemy: &[RunningEffect; MAX_SHIPS],
            targeting: TargetingType) -> (bool, u8, u8) {

            let current_ship_usize:usize = current_ship as usize;
            let position:i16 = ship_positions_own[current_ship_usize];
            let mut proposed_move:u8 = 0;
            let mut best_target:u8 = MAX_SHIPS as u8;
            let mut best_value:u16 = 0;

            if effects_own[current_ship_usize].blind == 0 {
                for enemy_ship in (0..MAX_SHIPS as u8).rev() {
                    let enemy_ship_usize:usize = enemy_ship as usize;

                    let position_diff:i16 = position as i16 - ship_positions_enemy[enemy_ship_usize] as i16;
                    let delta:u8 = position_diff.abs() as u8;
                    let range:u8 = self.get_range_stat(ships[current_ship_usize].range,
                        &effects_own[current_ship_usize]);
                    let speed:u8 = self.get_speed_stat(ships[current_ship_usize].speed,
                        &effects_own[current_ship_usize]);

                    if (delta <= range + speed) && ship_hps_enemy[enemy_ship_usize] > 0 {
                        let cur_value:u16 = self.get_stat_for_targeting(
                            targeting, enemy_ship_usize, delta, &ships, &effects_enemy);
                        if (best_target == MAX_SHIPS as u8) || self.is_stat_better_for_targeting(
                            targeting, cur_value, best_value) {

                            // We have found a target
                            best_target = enemy_ship;
                            best_value = cur_value;

                            // Do we need to move?
                            if delta > range {
                                proposed_move = delta - range;
                            } else {
                                proposed_move = 0;
                            }
                        }
                    }
                }
            }

            (best_target < (MAX_SHIPS as u8), best_target, proposed_move)
        }

        fn get_stat_for_targeting(&self, targeting: TargetingType,
            target_usize: usize, delta: u8, ships: &Vec<Ship>,
            effects: &[RunningEffect; MAX_SHIPS]) -> u16 {

            let attack: u16 = self.get_attack_stat(ships[target_usize].attack_base,
                &effects[target_usize]);
            let defence: u16 = self.get_defence_stat(ships[target_usize].defence,
                &effects[target_usize]);
            let speed: u16 = self.get_speed_stat(ships[target_usize].speed,
                &effects[target_usize]) as u16;
            let hp: u16 = ships[target_usize].hp;

            match targeting {
                TargetingType::Closest => return delta as u16,
                TargetingType::Furthest => return delta as u16,
                TargetingType::LowestAttack => return attack,
                TargetingType::LowestDefence => return defence,
                TargetingType::LowestSpeed => return speed,
                TargetingType::LowestHp => return hp,
                TargetingType::HighestAttack => return attack,
                TargetingType::HighestDefence => return defence,
                TargetingType::HighestSpeed => return speed,
                TargetingType::HighestHp => return hp,
            }
        }

        fn is_stat_better_for_targeting(&self, targeting: TargetingType,
            cur_value: u16, best_value: u16) -> bool {

            match targeting {
                TargetingType::Closest => return cur_value < best_value,
                TargetingType::Furthest => return cur_value > best_value,
                TargetingType::LowestAttack => return cur_value < best_value,
                TargetingType::LowestDefence => return cur_value < best_value,
                TargetingType::LowestSpeed => return cur_value < best_value,
                TargetingType::LowestHp => return cur_value < best_value,
                TargetingType::HighestAttack => return cur_value > best_value,
                TargetingType::HighestDefence => return cur_value > best_value,
                TargetingType::HighestSpeed => return cur_value > best_value,
                TargetingType::HighestHp => return cur_value > best_value,
            }
        }

        fn get_number_of_ships_from_hp(&self, hp_total: u32, hp: u16) -> u16 {
            let hp32: u32 = hp as u32;
            if hp_total % hp32 == 0 {
                (hp_total / hp32) as u16
            } else {
                (hp_total / hp32) as u16 + 1
            }
        }

        /// Calculate damage done by a ship to another ship.
        ///
        /// # Arguments
        ///
        /// * `variables` - An array that holds the precalculated variable damage coefficients
        /// * `effects_source` - An array that holds effects of the fleet of the player shooting
        /// * `effects_target` - An array that holds effects of the fleet of the player NOT shooting
        /// * `ships` - A Vec that holds the definiton of all the ships
        /// * `source` - Index of the ship shooting
        /// * `target` - Index of the ship being shot at
        /// * `source_hp` - HPs left, of the shooting ship
        ///
        /// # Returns
        ///
        /// * `damage` - The calculated damage
        fn calculate_damage(&self, variables: [u16; MAX_SHIPS], effects_source: &[RunningEffect; MAX_SHIPS],
            effects_target: &[RunningEffect; MAX_SHIPS], ships: &Vec<Ship>, source: u8,
            target: u8, source_hp: u32) -> u32 {

            let source_usize: usize = source as usize;
            let target_usize: usize = target as usize;
            let attack: u16 = self.get_attack_stat(ships[source_usize].attack_base,
                &effects_source[source_usize]) + variables[source_usize];
            let source_ships_count: u16 = self.get_number_of_ships_from_hp(source_hp, ships[source_usize].hp);
            let cap_damage: u32 = (source_ships_count as u32) * (ships[target_usize].hp as u32);
            let mut defence: u16 = self.get_defence_stat(ships[target_usize].defence,
                &effects_target[target_usize]);

            if defence > attack {
                defence = attack;
            }

            let damage: u32 = (attack - defence) as u32 * (source_ships_count as u32);

            return self.min(self.max(0, damage as i32), cap_damage as i32) as u32;
        }

        /// Logs the Shoot move into the moves array.
        ///
        /// # Arguments
        ///
        /// * `round` - Round in which the move took place
        /// * `moves` - The Moves array to modify (mutable)
        /// * `source` - Index of the ship performing the move
        /// * `target` - Index of the target ship
        /// * `damage` - Damage inflicted
        /// * `position` - New ship position (can be unchanged)
        fn log_shoot(&self, round: u8, moves: &mut Vec<Move>,
            source: u8, target: u8, damage: u32, position: i16,
            effects_lhs: &[RunningEffect; MAX_SHIPS],
            effects_rhs: &[RunningEffect; MAX_SHIPS]) {

            moves.push(Move {
                move_type: 1,
                round: round,
                source: source,
                target: target,
                damage: damage,
                target_position: position,
                effects_lhs: *effects_lhs,
                effects_rhs: *effects_rhs,
            });
        }

        /// Logs the Reposition move into the moves array.
        ///
        /// # Arguments
        ///
        /// * `round` - Round in which the move took place
        /// * `moves` - The Moves array to modify (mutable)
        /// * `source` - Index of the ship performing the move
        /// * `target` - Index of the target ship
        /// * `damage` - Damage inflicted
        /// * `position` - New ship position (can be unchanged)
        fn log_move(&self, round: u8, moves: &mut Vec<Move>,
            source: u8, target_position: i16,
            effects_lhs: &[RunningEffect; MAX_SHIPS],
            effects_rhs: &[RunningEffect; MAX_SHIPS]) {

            moves.push(Move {
                move_type: 2,
                round: round,
                source: source,
                target_position: target_position,
                target: 0,
                damage: 0,
                effects_lhs: *effects_lhs,
                effects_rhs: *effects_rhs,
            });
        }

        fn retire_effects(&self, effects_target: &mut [RunningEffect; MAX_SHIPS], target: u8) {
            let target_usize = target as usize;
            let target_effect: &mut RunningEffect = &mut effects_target[target_usize];

            if target_effect.snare > 0 {
                target_effect.snare = target_effect.snare - 1;
            }
            if target_effect.root > 0 {
                target_effect.root = target_effect.root - 1;
            }
            if target_effect.blind > 0 {
                target_effect.blind = target_effect.blind - 1;
            }
            if target_effect.defence_debuff > 0 {
                target_effect.defence_debuff = target_effect.defence_debuff - 1;
            }
            if target_effect.attack_debuff > 0 {
                target_effect.attack_debuff = target_effect.attack_debuff - 1;
            }
            if target_effect.range_debuff > 0 {
                target_effect.range_debuff = target_effect.range_debuff - 1;
            }
        }

        fn apply_effects(&self, modules_source: &[ShipModule; MAX_SHIPS],
            effects_target: &mut [RunningEffect; MAX_SHIPS],
            source: u8, target: u8, seed: u64) {

            let source_usize = source as usize;
            let target_usize = target as usize;
            let ship_module: ShipModule = modules_source[source_usize];
            let target_effect: &mut RunningEffect = &mut effects_target[target_usize];
            let dice_roll: u8 = (seed % 100) as u8;
            let effect_length: u8 = 1;

            if dice_roll < ship_module.snare {
                target_effect.snare += effect_length;
            }
            if dice_roll < ship_module.root {
                target_effect.root += effect_length;
            }
            if dice_roll < ship_module.blind {
                target_effect.blind += effect_length;
            }
            if dice_roll < ship_module.defence_debuff {
                target_effect.defence_debuff += effect_length;
            }
            if dice_roll < ship_module.attack_debuff {
                target_effect.attack_debuff += effect_length;
            }
            if dice_roll < ship_module.range_debuff {
                target_effect.range_debuff += effect_length;
            }
        }

        /// Calculates a fight.
        ///
        /// # Arguments
        ///
        /// * `seed` - Seed used to generate randomness
        /// * `log_moves` - Whether to return a detailed fight log
        /// * `ships` - A Vec that holds the definiton of all the ships
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
        ///
        /// # Algorithm rules:
        ///     A fight is divided into rounds.
        ///     Each round, ships perform moves in turns, starting from smallest ships.
        ///     In each round, the same type of ship, of both the attacker and defender,
        ///        attacks at the same time.
        ///     Ships can move, shoot, or both, depending on their Range and Speed.
        ///     The winner is declared when one player is dead, or when the fight is still not finished
        ///        after maximum number of rounds.
        #[ink(message)]
        pub fn fight(&self, seed: u64, log_moves: bool, ships: Vec<Ship>,
            selection_lhs: [u8; MAX_SHIPS], selection_rhs: [u8; MAX_SHIPS],
            modules_lhs: [ShipModule; MAX_SHIPS], modules_rhs: [ShipModule; MAX_SHIPS],
            targeting_lhs: TargetingType, targeting_rhs: TargetingType) ->
                (FightResult, Option<Vec<Move>>, Option<Vec<Move>>) {

            // Starting ship positions for both sides
            let mut ship_positions_lhs: [i16; MAX_SHIPS] = [10, 11, 12, 13];
            let mut ship_positions_rhs: [i16; MAX_SHIPS] = [-10, -11, -12, -13];
            // Current ship HPs, per ship type
            let mut ship_hps_lhs: [i32; MAX_SHIPS] = [0; MAX_SHIPS];
            let mut ship_hps_rhs: [i32; MAX_SHIPS] = [0; MAX_SHIPS];
            // Precalculated variable damage coefficients
            let mut variables_lhs: [u16; MAX_SHIPS] = [0; MAX_SHIPS];
            let mut variables_rhs: [u16; MAX_SHIPS] = [0; MAX_SHIPS];
            // Tracking running effects
            let mut effects_lhs: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let mut effects_rhs: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];

            // Precalculate the variables and initialize the ship HPs
            for i in 0..MAX_SHIPS {
                ship_hps_lhs[i] = (ships[i].hp as i32) * (selection_lhs[i] as i32);
                ship_hps_rhs[i] = (ships[i].hp as i32) * (selection_rhs[i] as i32);
                variables_lhs[i] = (seed % ships[i].attack_variable as u64) as u16;
                variables_rhs[i] = ((seed / 2) % ships[i].attack_variable as u64) as u16;
            }

            let mut lhs_moves: Option<Vec<Move>> = None;
            let mut rhs_moves: Option<Vec<Move>> = None;
            let mut total_rounds: u8 = 0;

            // Only initialize the moves when required, to save gas
            if log_moves {
                lhs_moves = Some(Vec::new());
                rhs_moves = Some(Vec::new());
            }

            // Loop intented to be broken out of if resolution is found quicker than MAX_ROUNDS
            for round in 0..MAX_ROUNDS {
                if self.is_dead(ship_hps_lhs) || self.is_dead(ship_hps_rhs) {
                    break;
                }

                let round_u8: u8 = round as u8;
                total_rounds = total_rounds + 1;

                // Loop through all the ships
                for current_ship in 0..MAX_SHIPS {
                    let current_ship_u8: u8 = current_ship as u8;
                    let mut lhs_has_target: bool = false;
                    let mut rhs_has_target: bool = false;
                    let lhs_dead_ship: bool = ship_hps_lhs[current_ship] <= 0;
                    let rhs_dead_ship: bool = ship_hps_rhs[current_ship] <= 0;
                    let mut lhs_damage: u32 = 0;
                    let mut rhs_damage: u32 = 0;
                    let mut lhs_target: u8 = 0;
                    let mut rhs_target: u8 = 0;
                    let mut lhs_delta_move: u8 = 0;
                    let mut rhs_delta_move: u8 = 0;
                    let lhs_current_ship_speed: u8 = self.get_speed_stat(
                        ships[current_ship].speed, &effects_lhs[current_ship]);
                    let rhs_current_ship_speed: u8 = self.get_speed_stat(
                        ships[current_ship].speed, &effects_rhs[current_ship]);

                    // Note, moving and dealing damage to attacker is delayed until defender has moved also
                    if !lhs_dead_ship {
                        (lhs_has_target, lhs_target, lhs_delta_move) = self.get_target(
                            &ships, current_ship_u8, ship_positions_lhs, ship_positions_rhs,
                            ship_hps_rhs, &effects_lhs, &effects_rhs, targeting_lhs);

                        if lhs_has_target {
                            lhs_damage = self.calculate_damage(variables_lhs, &effects_lhs, &effects_rhs,
                                &ships, current_ship_u8, lhs_target, ship_hps_lhs[current_ship] as u32);
                        }
                    }

                    if !rhs_dead_ship {
                        (rhs_has_target, rhs_target, rhs_delta_move) = self.get_target(
                            &ships, current_ship_u8, ship_positions_rhs, ship_positions_lhs,
                            ship_hps_lhs, &effects_rhs, &effects_lhs, targeting_rhs);

                        if rhs_has_target {
                            rhs_damage = self.calculate_damage(variables_rhs, &effects_rhs, &effects_lhs,
                                &ships, current_ship_u8, rhs_target, ship_hps_rhs[current_ship] as u32);

                            // Move the ships, apply the damage
                            ship_hps_lhs[rhs_target as usize] -= rhs_damage as i32;
                            ship_positions_rhs[current_ship] += rhs_delta_move as i16;

                            self.retire_effects(&mut effects_rhs, current_ship_u8);
                            self.apply_effects(&modules_rhs, &mut effects_lhs, current_ship_u8, rhs_target, seed);

                            // Log the move, if required
                            match rhs_moves {
                                Some(ref mut moves) =>
                                    self.log_shoot(round_u8, moves, current_ship_u8, rhs_target, rhs_damage,
                                        ship_positions_rhs[current_ship], &effects_lhs, &effects_rhs),
                                _ => ()
                            }
                        } else {
                            self.retire_effects(&mut effects_rhs, current_ship_u8);

                            // Move the ships
                            ship_positions_rhs[current_ship] += rhs_current_ship_speed as i16;

                            // Log the move, if required
                            match rhs_moves {
                                Some(ref mut moves) =>
                                    self.log_move(round_u8, moves, current_ship_u8,
                                        ship_positions_rhs[current_ship], &effects_lhs, &effects_rhs),
                                _ => ()
                            }
                        }
                    }

                    // Now applying attacker moves
                    if !lhs_dead_ship {
                        if lhs_has_target {
                            // Move the ships, apply the damage
                            ship_hps_rhs[lhs_target as usize] -= lhs_damage as i32;
                            ship_positions_lhs[current_ship] -= lhs_delta_move as i16;

                            self.retire_effects(&mut effects_lhs, current_ship_u8);
                            self.apply_effects(&modules_lhs, &mut effects_rhs, current_ship_u8, lhs_target, seed);

                            // Log the move, if required
                            match lhs_moves {
                                Some(ref mut moves) =>
                                    self.log_shoot(round_u8, moves, current_ship_u8, lhs_target, lhs_damage,
                                        ship_positions_lhs[current_ship], &effects_lhs, &effects_rhs),
                                _ => ()
                            }
                        } else {
                            self.retire_effects(&mut effects_lhs, current_ship_u8);

                            // Move the ships
                            ship_positions_lhs[current_ship] -= lhs_current_ship_speed as i16;

                            // Log the move, if required
                            match lhs_moves {
                                Some(ref mut moves) =>
                                    self.log_move(round_u8, moves, current_ship_u8,
                                        ship_positions_lhs[current_ship], &effects_lhs, &effects_rhs),
                                _ => ()
                            }
                        }
                    }
                }
            }

            // Calculate ships lost according to HPs left
            let mut ships_lost_lhs: [u8; MAX_SHIPS] = [0; MAX_SHIPS];
            let mut ships_lost_rhs: [u8; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                let safe_hp_lhs: u32 = self.max(ship_hps_lhs[i], 0) as u32;
                let safe_hp_rhs: u32 = self.max(ship_hps_rhs[i], 0) as u32;
                ships_lost_lhs[i] = (((selection_lhs[i] as u32 * ships[i].hp as u32) - safe_hp_lhs) / ships[i].hp as u32) as u8;
                ships_lost_rhs[i] = (((selection_rhs[i] as u32 * ships[i].hp as u32) - safe_hp_rhs) / ships[i].hp as u32) as u8;
            }

            let mut total_rhs_ships: u16 = 0;
            for i in 0..MAX_SHIPS {
                total_rhs_ships += selection_rhs[i] as u16;
            }

            let result: FightResult = FightResult {
                selection_lhs: selection_lhs,
                selection_rhs: selection_rhs,
                modules_lhs: modules_lhs,
                modules_rhs: modules_rhs,
                targeting_lhs: targeting_lhs,
                targeting_rhs: targeting_rhs,
                lhs_dead: total_rhs_ships > 0 && self.is_dead(ship_hps_lhs),
                rhs_dead: self.is_dead(ship_hps_rhs),
                ships_lost_lhs: ships_lost_lhs,
                ships_lost_rhs: ships_lost_rhs,
                rounds: total_rounds,
                seed: seed
            };

            (result, lhs_moves, rhs_moves)
        }
    }


    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_fight_end_to_end() {
            let contract = NewOmega::default();
            let ships: Vec<Ship> = prepare_ships();
            let seed: u64 = 1337;
            let log_moves: bool = true;
            let selection_lhs: [u8; MAX_SHIPS] = [20, 20, 20, 20];
            let selection_rhs: [u8; MAX_SHIPS] = [5, 5, 5, 5];
            let modules_lhs: [ShipModule; MAX_SHIPS] = [ShipModule::default(); MAX_SHIPS];
            let modules_rhs: [ShipModule; MAX_SHIPS] = [ShipModule::default(); MAX_SHIPS];
            let targeting_lhs: TargetingType = TargetingType::Closest;
            let targeting_rhs: TargetingType = TargetingType::Closest;

            let (result, _moves_lhs, _moves_rhs) = contract.fight(seed, log_moves, ships,
                selection_lhs, selection_rhs, modules_lhs, modules_rhs, targeting_lhs,
                targeting_rhs);

            assert!(result.rhs_dead);
        }

        #[test]
        fn test_damage_calculation() {
            let contract = NewOmega::default();
            let ships: Vec<Ship> = prepare_ships();
            let effects_source: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let effects_target: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let variables: [u16; MAX_SHIPS] = [0, 1, 2, 3];
            let source: u8 = 0;
            let target: u8 = 0;
            let source_hp: u32 = ships[source as usize].hp as u32;
            let damage: u32 = contract.calculate_damage(variables, &effects_source,
                &effects_target, &ships, source, target, source_hp);

            let source_hp_damaged: u32 = source_hp - 1;
            let damage_damaged: u32 = contract.calculate_damage(variables, &effects_source,
                &effects_target, &ships, source, target, source_hp_damaged);

            let source_hp_bigstack: u32 = source_hp * 32;
            let damage_bigstack: u32 = contract.calculate_damage(variables, &effects_source,
                &effects_source, &ships, source, target, source_hp_bigstack);

            assert_eq!(damage, 60);
            assert_eq!(damage_damaged, 60);
            assert_eq!(damage_bigstack, 60 * 32);
        }

        #[test]
        fn test_is_stat_better_for_targeting() {
            let contract = NewOmega::default();

            assert!(contract.is_stat_better_for_targeting(
                TargetingType::Closest, 5, 7));
            assert!(contract.is_stat_better_for_targeting(
                TargetingType::Furthest, 7, 5));
            assert!(contract.is_stat_better_for_targeting(
                TargetingType::HighestHp, 7, 5));
            assert!(contract.is_stat_better_for_targeting(
                TargetingType::LowestSpeed, 2, 5));
        }

        #[test]
        fn test_get_stat_for_targeting() {
            let contract = NewOmega::default();
            let ships: Vec<Ship> = prepare_ships();
            let effects_source: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let effects_target: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];

            let delta: u8 = 11;
            assert_eq!(contract.get_stat_for_targeting(
                TargetingType::Closest, 0, delta, &ships, &effects_target), delta as u16);
            assert_eq!(contract.get_stat_for_targeting(
                TargetingType::Furthest, 0, delta, &ships, &effects_target), delta as u16);
            assert_eq!(contract.get_stat_for_targeting(
                TargetingType::HighestHp, 0, delta, &ships, &effects_target), ships[0].hp);
            assert_eq!(contract.get_stat_for_targeting(
                TargetingType::LowestSpeed, 0, delta, &ships, &effects_target), ships[0].speed as u16);
        }

        #[test]
        fn test_get_target() {
            let contract = NewOmega::default();
            let ships: Vec<Ship> = prepare_ships();
            let effects_source: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let effects_target: [RunningEffect; MAX_SHIPS] = [RunningEffect::default(); MAX_SHIPS];
            let ship_positions_lhs: [i16; MAX_SHIPS] = [10, 11, 12, 13];
            let ship_positions_rhs: [i16; MAX_SHIPS] = [-10, -11, -12, -13];
            let ship_hps_enemy: [i32; MAX_SHIPS] = [1000, 1000, 1000, 1000];
            let current_ship: u8 = MAX_SHIPS as u8 - 1;
            let mut has_target: bool = false;
            let mut target: u8 = 0;
            let mut _delta_move: u8 = 0;

            (has_target, target, _delta_move) = contract.get_target(&ships,
                current_ship, ship_positions_lhs, ship_positions_rhs,
                ship_hps_enemy, &effects_source, &effects_target, TargetingType::Closest);

            assert!(has_target);
            assert_eq!(target, 0);

            (has_target, target, _delta_move) = contract.get_target(&ships,
                current_ship, ship_positions_lhs, ship_positions_rhs,
                ship_hps_enemy, &effects_source, &effects_target, TargetingType::Furthest);

            assert!(has_target);
            assert_eq!(target, current_ship);
        }

        #[test]
        fn test_isdead() {
            let contract = NewOmega::default();
            let alive_ship_hps: [i32; MAX_SHIPS] = [20, -20, 0, 0];
            let is_dead_first: bool = contract.is_dead(alive_ship_hps);

            assert_eq!(is_dead_first, false);

            let dead_ship_hps: [i32; MAX_SHIPS] = [-100, -20, 0, 0];
            let is_dead_second: bool = contract.is_dead(dead_ship_hps);

            assert_eq!(is_dead_second, true);
        }
    }
}
