#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegauniverse::NewOmegaUniverse;
pub use self::newomegauniverse::Planet;
pub use self::newomegauniverse::System;
pub use self::newomegauniverse::SystemCoordinate;
pub use self::newomegauniverse::PlayerAssets;
pub use self::newomegauniverse::GameStats;

#[ink::contract]
mod newomegauniverse {
    use newomegagame::NewOmegaGame;
    use newomega::MAX_SHIPS;
    use newomega::FightResult;
    use newomega::ShipModule;
    use newomega::TargetingType;
    use newomegastorage::NewOmegaStorage;
    use newomegastorage::MAX_MINERALS;
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

    pub const MAX_PLANETS: usize = 5;
    pub const MAX_PLANET_TYPES: usize = 20;
    pub const PLANETS_FOR_CONTROL: usize = 3;
    pub const MAX_HARVESTABLE_BLOCKS: BlockNumber = 24000;
    pub const MINERAL_GENERATION_BLOCKS: BlockNumber = 100;
    pub const START_WITH_PLANETS: u8 = 3;
    pub const MAX_PLANET_LEVEL: u8 = 100;

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
    pub struct Planet {
        /// Fleet composition
        selection: [u8; MAX_SHIPS],
        /// Fleet modules
        modules: [ShipModule; MAX_SHIPS],
        /// Targeting
        targeting: TargetingType,
        /// Level
        level: u8,
        /// Owner
        owner: AccountId,
        /// Type (0-MAX_PLANET_TYPES)
        planet_type: u8,
        /// Mineral type (0-MAX_MINERALS)
        mineral_type: u8,
        /// Mineral proof (0-100)
        mineral_proof: u8,
        /// Last harvested
        last_harvested: BlockNumber,
        /// Name
        name: Option<String>,
    }

    impl Default for Planet {
        fn default() -> Self {
            Planet {
                selection: [10; MAX_SHIPS],
                modules: [ShipModule::default(); MAX_SHIPS],
                targeting: TargetingType::default(),
                level: 1,
                planet_type: 0,
                mineral_type: 0,
                mineral_proof: 0,
                owner: AccountId::default(),
                last_harvested: 0,
                name: None,
            }
        }
    }

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Copy)]
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
    pub struct GameStats {
        /// Number of players
        no_players: u64,
        /// Number of systems
        no_systems: u64,
    }

    /// Describes a registered defence of a player
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
    pub struct SystemCoordinate {
        pub root: AccountId,
        position_x: i32,
        position_y: i32,
    }

    #[derive(scale::Encode, scale::Decode, SpreadLayout, PackedLayout, Clone, Default)]
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
    pub struct Gateway {
        built: bool,
        target: SystemCoordinate,
    }

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
    pub struct System {
        /// Position of the system
        position: SystemCoordinate,
        /// Gateway in
        gateway_in: Gateway,
        /// Gateway out
        gateway_out: Gateway,
        /// Planets
        planets: Vec<Planet>,
        /// Discoverer
        discoverer: AccountId,
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
    pub struct PlayerAssets {
        name: String,
    }

    impl PlayerAssets {
        fn new(name: String) -> Self {
            PlayerAssets {
                name,
            }
        }
    }

    #[ink(storage)]
    pub struct NewOmegaUniverse {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega_game: Option<newomegagame::NewOmegaGame>,
        new_omega_storage: Option<newomegastorage::NewOmegaStorage>,
        systems: StorageHashMap<AccountId, Vec<System>>,
        assets: StorageHashMap<AccountId, PlayerAssets>,
    }

    impl NewOmegaUniverse {
        #[ink(constructor)]
        pub fn new(new_omega_game: NewOmegaGame, new_omega_storage: NewOmegaStorage) -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: Some(new_omega_game),
                new_omega_storage: Some(new_omega_storage),
                systems: StorageHashMap::default(),
                assets: StorageHashMap::default(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: None,
                new_omega_storage: None,
                systems: StorageHashMap::default(),
                assets: StorageHashMap::default(),
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

        /// Gets a System according to its coordinate
        ///
        /// # Arguments
        ///
        /// * `coord` - The SystemCoordinate of the system to get
        ///
        /// # Returns
        ///
        /// * `system` - An Option containing the System, or None
        pub fn get_system(&self, coord: SystemCoordinate) -> Option<System> {
            assert!(self.systems.get(&coord.root).is_some());

            let systems: Vec<System> =
                self.systems
                    .get(&coord.root)
                    .unwrap()
                    .to_vec();

            systems
                .iter()
                .filter(|system| system.position.position_x == coord.position_x &&
                    system.position.position_y == coord.position_y)
                .cloned()
                .last()
        }

        /// Gets a System according to its coordinate and check whether its attackable by a given player
        ///
        /// # Arguments
        ///
        /// * `caller` - The AccountId of a player to check attackability for
        /// * `coord` - The SystemCoordinate of the system to get
        ///
        /// # Returns
        ///
        /// * `system` - An Option containing the System, or None
        /// * `attackable` - Whether the System is attackable by the player `caller`
        #[ink(message)]
        pub fn get_system_check(&self, caller: AccountId, coord: SystemCoordinate) ->
            (Option<System>, bool) {

            let system = self.get_system(coord);
            let mut can_attack: bool = false;
            if system.is_some() {
                let position = system.clone().unwrap().position;
                can_attack = self.can_attack_planet(caller, position);
            }

            (system, can_attack)
        }

        /// Gets a mutable reference to a System, according to its coordinate
        ///
        /// # Arguments
        ///
        /// * `coord` - The SystemCoordinate of the system to get
        ///
        /// # Returns
        ///
        /// * `system` - A mutable reference to the System
        pub fn get_system_mut(&mut self, coord: SystemCoordinate) -> &mut System {
            assert!(self.systems.get_mut(&coord.root).is_some());

            let systems: &mut Vec<System> =
                self.systems
                    .get_mut(&coord.root)
                    .unwrap();

            systems
                .iter_mut()
                .filter(|system| system.position.position_x == coord.position_x &&
                    system.position.position_y == coord.position_y)
                .last()
                .unwrap()
        }

        /// Generates a random planet type
        ///
        /// # Arguments
        ///
        /// * `seed` - The random seed
        /// * `sub_seed` - The random sub seed
        ///
        /// # Returns
        ///
        /// * `u8` - Planet type
        pub fn generate_planet_type(&self, seed: u64, sub_seed: u64) -> u8 {
            let final_seed: u64 = seed / (sub_seed + 1);
            (final_seed % MAX_PLANET_TYPES as u64) as u8
        }

        /// Generates a random mineral type
        ///
        /// # Arguments
        ///
        /// * `seed` - The random seed
        /// * `sub_seed` - The random sub seed
        ///
        /// # Returns
        ///
        /// * `u8` - Mineral type
        pub fn generate_mineral_type(&self, seed: u64, sub_seed: u64) -> u8 {
            let final_seed: u64 = seed / (sub_seed + 1);
            (final_seed % MAX_MINERALS as u64) as u8
        }

        /// Generates a random mineral proof
        ///
        /// # Arguments
        ///
        /// * `seed` - The random seed
        /// * `sub_seed` - The random sub seed
        ///
        /// # Returns
        ///
        /// * `u8` - Mineral proof
        pub fn generate_mineral_proof(&self, seed: u64, sub_seed: u64) -> u8 {
            let final_seed: u64 = seed / (sub_seed + 1);
            (final_seed % 100 as u64) as u8
        }

        /// Generates a random seed
        ///
        /// # Returns
        ///
        /// * `u64` - The random seed
        pub fn generate_random_seed(&self) -> u64 {
            self.env().block_timestamp() + self.env().block_number() as u64
        }

        /// Registers a player in the Universe module. 
        /// Performs all neccesary ensures so that the account is fully playable.
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to register
        /// * `name` - The name under which to register the player
        #[ink(message)]
        pub fn register_player(&mut self, caller: AccountId, name: String) {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.systems.get(&caller).is_none());

            let new_position = SystemCoordinate {
                root: caller,
                position_x: 0,
                position_y: 0,
            };
            let new_planets: Vec<Planet> = self.generate_planets(new_position, START_WITH_PLANETS, Some(caller));
            let mut new_systems: Vec<System> = Vec::default();
            new_systems.push(System {
                position: new_position,
                discoverer: caller,
                planets: new_planets,
                gateway_in: Gateway::default(),
                gateway_out: Gateway::default(),
            });

            self.systems
                .insert(caller, new_systems);
            self.assets
                .insert(caller, PlayerAssets::new(name));
            if self.new_omega_storage.is_some() {
                self.new_omega_storage
                    .as_mut()
                    .unwrap()
                    .ensure_minerals(caller);
                self.new_omega_storage
                    .as_mut()
                    .unwrap()
                    .ensure_trades(caller);
                self.new_omega_storage
                    .as_mut()
                    .unwrap()
                    .ensure_ships(caller);
            }
        }

        /// Translates AccountIds of players into their registered names
        ///
        /// # Arguments
        ///
        /// * `players` - The AccountIds of players to get names for
        ///
        /// # Returns
        ///
        /// * `names` - Vec of Strings containing the names
        #[ink(message)]
        pub fn get_player_names(&self, players: Vec<AccountId>) -> Vec<String> {
            let mut translated: Vec<String> = Vec::new();
            for player in players {
                if player == AccountId::default() {
                    translated.push(String::from("None"));
                } else {
                    let asset: &PlayerAssets = self.assets.get(&player).unwrap();
                    translated.push(asset.name.clone());
                }
            }

            translated
        }

        /// Reinforces a players owned planet with a fleet selection and sets tactics.
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player
        /// * `target` - The location of the planet to reinforce
        /// * `planet_id` - Which planet to attack (0..MAX_PLANETS)
        /// * `selection` - The fleet selection to register
        /// * `modules` - The modules to register with the fleet
        /// * `targeting` - The targeting to register with the fleet
        #[ink(message)]
        pub fn reinforce_planet(&mut self, caller: AccountId, target: SystemCoordinate,
            planet_id: u8, selection: [u8; MAX_SHIPS], modules: [ShipModule; MAX_SHIPS],
            targeting: TargetingType) {

            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }

            let system = self.get_system(target).unwrap();
            let planet = &system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);

            let mut planet_selection: [u32; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                planet_selection[i] = planet.selection[i] as u32;
            }
            let mut selection_u32: [u32; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                selection_u32[i] = selection[i] as u32;
            }

            self    
                .new_omega_storage
                .as_mut()
                .unwrap()
                .add_ships(caller, planet_selection);

            let has_enough = self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .has_enough_ships(caller, selection);

            assert!(has_enough);

            self    
                .new_omega_storage
                .as_mut()
                .unwrap()
                .remove_ships(caller, selection_u32);

            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];
            planet_mut.selection = selection;
            planet_mut.modules = modules;
            planet_mut.targeting = targeting;
        }

        /// Generates a new set of planets
        ///
        /// # Arguments
        ///
        /// * `target` - SystemCoordinate where to generate planets in
        /// * `start_ownership` - How many planets will be assigned to the player
        /// * `owner` - When starting ownership, who will be the owner
        ///
        /// # Returns
        ///
        /// * `planets` - Vec of newly generated Planets
        pub fn generate_planets(&self, target: SystemCoordinate, start_ownership: u8, owner: Option<AccountId>) -> Vec<Planet> {
            let seed: u64 = self.generate_random_seed();
            let block_number = self.env().block_number();
            let mut new_planets: Vec<Planet> = Vec::default();
            for i in 0..MAX_PLANETS {
                let mut new_planet = Planet::default();
                let sub_seed: u64 =
                    (i as u64) +
                    (target.position_x as u64) +
                    (target.position_y as u64);
                new_planet.planet_type = self.generate_planet_type(seed, sub_seed);
                new_planet.mineral_type = self.generate_mineral_type(seed, sub_seed);
                new_planet.mineral_proof = self.generate_mineral_proof(seed, sub_seed);
                new_planet.last_harvested = block_number;
                if start_ownership > 0 && i < (start_ownership as usize) {
                    new_planet.owner = owner.unwrap();
                }
                new_planets.push(new_planet);
            }

            new_planets
        }

        /// Renames a planet
        ///
        /// # Arguments
        ///
        /// * `caller` - The player making the rename request
        /// * `target` - SystemCoordinate of the the planet to rename
        /// * `planet_id` - Which planet to rename (0..MAX_PLANETS)
        /// * `name` - The name to set
        #[ink(message)]
        pub fn rename_planet(&mut self, caller: AccountId, target: SystemCoordinate, planet_id: u8, name: String) {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.get_system(target).is_some());

            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];

            assert_eq!(planet_mut.owner, caller);

            planet_mut.name = Some(name);
        }

        /// Discovers a given system for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player making the discovery request
        /// * `target` - SystemCoordinate to discover a System in
        #[ink(message)]
        pub fn discover_system(&mut self, caller: AccountId, target: SystemCoordinate) {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.systems.get(&target.root).is_some());
            assert!(self.get_system(target).is_none());

            // TODO verify if player owns an adjacent system

            let new_planets = self.generate_planets(target, 0, None);
            let systems = self.systems.get_mut(&target.root).unwrap();
            systems.push(System {
                position: target,
                discoverer: caller,
                planets: new_planets,
                gateway_in: Gateway::default(),
                gateway_out: Gateway::default(),
            });
        }

        /// Gets a random discoverable system for a given player
        ///
        /// # Arguments
        ///
        /// * `root` - AccountId of the player in whos Universe to find a discoverable system
        ///
        /// # Returns
        ///
        /// * `coord` - The coordinate of the system, or None
        pub fn get_random_discoverable_system(&self, root: AccountId) -> Option<SystemCoordinate> {
            let systems = self.systems.get(&root).unwrap();
            for system in systems {
                let adjacent_systems_coords: [SystemCoordinate; 4] =
                    self.get_adjacent_system_coords(&system.position);
                for adjacent_system_coords in adjacent_systems_coords.iter() {
                    if adjacent_system_coords.position_x >= 0 &&
                        adjacent_system_coords.position_y >= 0 {

                        match self.get_system(*adjacent_system_coords) {
                            None => return Some(*adjacent_system_coords),
                            _ => (),
                        }
                    }
                }
            }

            None
        }

        /// Gets a target for a new gateway in a players territory
        ///
        /// # Arguments
        ///
        /// * `root` - AccountId of the player in whos Universe to find a gateway target
        /// * `seed` - The random seed
        ///
        /// # Returns
        ///
        /// * `coord` - The coordinate of the system, or None
        pub fn get_player_gateway_target(&self, root: AccountId, seed: u64) -> Option<SystemCoordinate> {
            let systems = self.systems.get(&root).unwrap();
            let avail_systems = systems
                .iter()
                .filter(|system| !system.gateway_in.built);

            let no_systems: usize = avail_systems.clone().count();
            if no_systems > 0 {
                let random_system = seed % no_systems as u64;
                let system = avail_systems
                    .enumerate()
                    .filter(|&(i, _)| i == random_system as usize)
                    .map(|(_, e)| e)
                    .last();

                return Some(system.unwrap().position);
            }

            self.get_random_discoverable_system(root)
        }

        /// Gets a random target for a players gateway
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player in whos Universe to build a gateway target
        ///
        /// # Returns
        ///
        /// * `coord` - The coordinate of the system, or None
        pub fn get_random_gateway_target(&self, caller: AccountId) -> Option<SystemCoordinate> {
            let players = self.systems.keys();
            let no_players = players.len() - 1; // Without caller
            let seed: u64 = self.generate_random_seed();
            let random = seed % no_players as u64;
            let root_vec: Vec<&AccountId> = players
                .filter(|&account| *account != caller)
                .enumerate()
                .filter(|&(i, _)| i == random as usize)
                .map(|(_, e)| e)
                .collect();
            let root: AccountId = *root_vec[0];

            self.get_player_gateway_target(root, seed)
        }

        /// Worker function for gateway out building
        ///
        /// # Arguments
        ///
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        pub fn build_gateway_out_worker(&mut self,
            target: SystemCoordinate, position: SystemCoordinate) {

            let mut system = self.get_system_mut(target);
            system.gateway_out.built = true;
            system.gateway_out.target = position;
        }

        /// Worker function for gateway in building
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the connecting player (building gateway out)
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        pub fn build_gateway_in_worker(&mut self, caller: AccountId,
            target: SystemCoordinate, position: SystemCoordinate) {

            if self.get_system(target).is_none() {
                let new_planets = self.generate_planets(target, 0, None);
                let systems = self.systems.get_mut(&target.root).unwrap();
                systems.push(System {
                    position: target,
                    discoverer: caller,
                    planets: new_planets,
                    gateway_in: Gateway {
                        built: true,
                        target: position,
                    },
                    gateway_out: Gateway::default(),
                });
            } else {
                let mut system = self.get_system_mut(target);
                system.gateway_in.built = true;
                system.gateway_in.target = position;
            }
        }

        /// Builds a gateway (out) in a System in players universe
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the connecting player (building gateway out)
        /// * `source` - SystemCoordinate of the System to build gateway in
        #[ink(message)]
        pub fn build_gateway(&mut self, caller: AccountId, source: SystemCoordinate) {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert_eq!(caller, source.root);
            assert!(self.systems.get(&source.root).is_some());
            assert!(self.get_system(source).is_some());

            let gateway_target_coord = self.get_random_gateway_target(source.root);
            if gateway_target_coord.is_some() {
                self.build_gateway_out_worker(source, gateway_target_coord.unwrap());
                self.build_gateway_in_worker(caller, gateway_target_coord.unwrap(), source);
            } else {
                // Should not happen unless the user is the lone player
            }
        }

        /// Gets general game statistics
        ///
        /// # Returns
        ///
        /// * `stats` - The game statistics
        #[ink(message)]
        pub fn get_game_stats(&self) -> GameStats {
            GameStats {
                no_players: self.systems.keys().len() as u64,
                no_systems: self.systems.iter().len() as u64, // TODO this doesnt work
            }
        }

        /// Checks whether a player is owner of a system
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player in whos Universe to build a gateway target
        /// * `system` - The System to check players ownership of
        ///
        /// # Returns
        ///
        /// * `is_owner` - Whether the player is owner of that system
        pub fn is_owner_of_system(&self, caller: AccountId, system: &System) -> bool {
            let mut caller_planet_count: u8 = 0;
            for planet in system.planets.iter() {
                if planet.owner == caller {
                    caller_planet_count = caller_planet_count + 1;
                }
            }

            caller_planet_count >= (PLANETS_FOR_CONTROL as u8)
        }

        /// Worker function to generate adjacent system coordinates for a given system
        ///
        /// # Arguments
        ///
        /// * `system` - The System to generate adjacent coordinates for 
        ///
        /// # Returns
        ///
        /// * `coords` - The list of adjacent coordinates
        pub fn get_adjacent_system_coords(&self, system: &SystemCoordinate) -> [SystemCoordinate; 4] {
            [
                SystemCoordinate {
                    root: system.root,
                    position_x: system.position_x - 1,
                    position_y: system.position_y,
                },
                SystemCoordinate {
                    root: system.root,
                    position_x: system.position_x + 1,
                    position_y: system.position_y,
                },
                SystemCoordinate {
                    root: system.root,
                    position_x: system.position_x,
                    position_y: system.position_y - 1,
                },
                SystemCoordinate {
                    root: system.root,
                    position_x: system.position_x,
                    position_y: system.position_y + 1,
                },
            ]
        }

        /// Checks whether a player can attack a planet in a given system
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to check attackability for
        /// * `target` - The System to check attackability of
        ///
        /// # Returns
        ///
        /// * `can_attack` - Whether a player can attack a system
        pub fn can_attack_planet(&self, caller: AccountId, target: SystemCoordinate) -> bool {
            if target.root == caller {
                return true;
            }

            let system: System = self.get_system(target).unwrap();
            if self.is_owner_of_system(caller, &system) {
                return true;
            }

            let mut owner_found: bool = false;
            let adjacent_systems_coords: [SystemCoordinate; 4] = self.get_adjacent_system_coords(&target);
            for adjacent_system_coords in adjacent_systems_coords.iter() {
                match self.get_system(*adjacent_system_coords) {
                    Some(ref adjacent_system) =>
                        owner_found |= self.is_owner_of_system(caller, &adjacent_system),
                    _ => ()
                }

                if !owner_found {
                    // check if the system has a gateway, and does it point to a system owned by caller
                    if system.gateway_in.built {
                        let gateway_in_system: System = self.get_system(system.gateway_in.target).unwrap();
                        owner_found |= self.is_owner_of_system(caller, &gateway_in_system);
                    }

                    if !owner_found && system.gateway_out.built {
                        let gateway_out_system: System = self.get_system(system.gateway_out.target).unwrap();
                        owner_found |= self.is_owner_of_system(caller, &gateway_out_system);
                    }
                }
            }

            owner_found
        }

        pub fn min(lhs: u32, rhs: u32) -> u32 {
            if lhs < rhs {
                lhs
            } else {
                rhs
            }
        }

        /// Gets the Assets for a given player
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to get Assets for
        ///
        /// # Returns
        ///
        /// * `assets` - The Assets
        #[ink(message)]
        pub fn get_player_assets(&self, caller: AccountId) -> PlayerAssets {
            assert!(self.assets.get(&caller).is_some());
            let asset: &PlayerAssets = self.assets.get(&caller).unwrap();

            PlayerAssets {
                name: asset.name.clone(),
            }
        }

        /// Gets the Universe Map for a given player
        ///
        /// # Arguments
        ///
        /// * `root` - The player to get the Map for
        ///
        /// # Returns
        ///
        /// * `map` - Vec of Systems comprising the Universe Map of a player
        #[ink(message)]
        pub fn get_universe_map(&self, root: AccountId) -> Vec<System> {
            self.systems
                .get(&root)
                .unwrap()
                .to_vec()
        }

        /// Harvest all planets in a players Universe, which the player owns
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to harvest planets for
        #[ink(message)]
        pub fn harvest(&mut self, caller: AccountId) {
            assert_eq!(self.env().caller(), self.owner.unwrap());
            assert!(self.systems.get(&caller).is_some());

            let block_number = self.env().block_number();
            let mut harvested: [u32; MAX_MINERALS] = [0; MAX_MINERALS];
            let systems = self.systems.get_mut(&caller).unwrap();
            for system in systems.iter_mut() {
                for mut planet in system.planets.iter_mut() {
                    if planet.owner == caller {
                        let block_diff: BlockNumber = NewOmegaUniverse::min(block_number - planet.last_harvested, MAX_HARVESTABLE_BLOCKS);
                        let amount: u32 = (block_diff / MINERAL_GENERATION_BLOCKS) * planet.level as u32 * planet.mineral_proof as u32;
                        harvested[planet.mineral_type as usize] += amount;
                        planet.last_harvested = block_number;
                    }
                }
            }

            self.new_omega_storage
                .as_mut()
                .unwrap()
                .add_minerals(caller, harvested);
        }

        /// Harvest a specific planet that the player owns
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to harvest planet for
        /// * `target`- SystemCoordinate of the system the planet to harvest is in
        /// * `planet_id` - Which planet to harvest
        #[ink(message)]
        pub fn harvest_planet(&mut self, caller: AccountId, target: SystemCoordinate, planet_id: u8) {
            assert_eq!(self.env().caller(), self.owner.unwrap());
            assert!(self.systems.get(&caller).is_some());

            let block_number = self.env().block_number();
            let mut harvested: [u32; MAX_MINERALS] = [0; MAX_MINERALS];

            let system: &mut System = self.get_system_mut(target);
            let planet: &mut Planet = &mut system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);

            let block_diff: BlockNumber = NewOmegaUniverse::min(block_number - planet.last_harvested, MAX_HARVESTABLE_BLOCKS);
            let amount: u32 = (block_diff / MINERAL_GENERATION_BLOCKS) * planet.level as u32 * planet.mineral_proof as u32;
            harvested[planet.mineral_type as usize] += amount;
            planet.last_harvested = block_number;

            self.new_omega_storage
                .as_mut()
                .unwrap()
                .add_minerals(caller, harvested);
        }

        /// Upgrades a specific planet that the player owns
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to upgrade planet for
        /// * `target`- SystemCoordinate of the system the planet to upgrade is in
        /// * `planet_id` - Which planet to upgrade
        #[ink(message)]
        pub fn upgrade_planet(&mut self, caller: AccountId, target: SystemCoordinate, planet_id: u8) {
            assert_eq!(self.env().caller(), self.owner.unwrap());
            assert!(self.systems.get(&caller).is_some());

            let system: &mut System = self.get_system_mut(target);
            let planet: &mut Planet = &mut system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);
            assert!(planet.level < MAX_PLANET_LEVEL);

            planet.level = planet.level + 1;
        }

        /// Attacks a planet
        ///
        /// # Arguments
        ///
        /// * `caller` - The player initating the attack
        /// * `target`- SystemCoordinate of the system the planet to attack is in
        /// * `planet_id` - Which planet to attack
        /// * `selection` - Fleet selection to use in the attack
        /// * `modules` - Fleet modules to use in the attack
        /// * `targeting` - Fleet targeting to use in the attack
        ///
        /// # Returns
        ///
        /// * `result` - The fight result
        #[ink(message)]
        pub fn attack_planet(
            &mut self,
            caller: AccountId,
            target: SystemCoordinate,
            planet_id: u8,
            selection: [u8; MAX_SHIPS],
            modules: [ShipModule; MAX_SHIPS],
            targeting: TargetingType) -> FightResult {

            assert_eq!(self.env().caller(), self.owner.unwrap(), "Wrong delegator");
            assert!(self.can_attack_planet(caller, target), "Cant attack planet");
            assert!(self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .has_enough_ships(caller, selection), "Not enough ships");

            // Determine the seed, in a naive way -> IMPROVEME: MOVE TO VRF
            let seed: u64 = self.generate_random_seed();
            let target_system_wrapped: Option<System> = self.get_system(target);

            assert!(target_system_wrapped.is_some(), "Target doesnt exist");

            let target_system: System = target_system_wrapped.unwrap();
            let target_planet = &target_system.planets[planet_id as usize];

            // Calculate the fight result
            let (result, _lhs_moves, _rhs_moves) =
                self.new_omega_game.as_ref().unwrap().fight(
                    seed,
                    false,
                    selection,
                    target_planet.selection,
                    modules,
                    target_planet.modules,
                    targeting,
                    target_planet.targeting);

            if result.rhs_dead && !result.lhs_dead {
                let target_system_mut: &mut System = self.get_system_mut(target);
                let target_planet_mut: &mut Planet = &mut target_system_mut.planets[planet_id as usize];

                target_planet_mut.owner = caller;
                target_planet_mut.selection = [0; MAX_SHIPS];
                target_planet_mut.modules = [ShipModule::default(); MAX_SHIPS];
                target_planet_mut.targeting = TargetingType::default();
            }

            let mut ships_lost_u32: [u32; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                ships_lost_u32[i] = result.ships_lost_lhs[i] as u32;
            }

            self
                .new_omega_storage
                .as_mut()
                .unwrap()
                .remove_ships(caller, ships_lost_u32);

            result
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
        fn test_register() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let player: AccountId = accounts.alice;

            contract.register_player(player, String::from("Test"));

            let system: Option<System> = contract.get_system(SystemCoordinate {
                root: player,
                position_x: 0,
                position_y: 0,
            });
            assert!(system.is_some());

            let system_unwrapped = system.unwrap();
            assert_eq!(system_unwrapped.position.root, player);
            assert_eq!(system_unwrapped.position.position_x, 0);
            assert_eq!(system_unwrapped.position.position_y, 0);
            assert_eq!(system_unwrapped.planets[0].selection, [10; 4]);
            assert_eq!(system_unwrapped.planets[3].selection, [10; 4]);
            assert_eq!(system_unwrapped.planets[0].owner, accounts.alice);
            assert_eq!(system_unwrapped.planets[1].owner, accounts.alice);
            assert_eq!(system_unwrapped.planets[2].owner, accounts.alice);
            assert_eq!(system_unwrapped.planets[3].owner, AccountId::default());
            assert_eq!(system_unwrapped.planets[4].owner, AccountId::default());
        }

        #[ink::test]
        fn test_systems() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let player: AccountId = accounts.alice;

            contract.register_player(player, String::from("Test"));

            let system: Option<System> = contract.get_system(SystemCoordinate {
                root: player,
                position_x: 1,
                position_y: 1,
            });
            assert!(system.is_none());

            let map: Vec<System> = contract.get_universe_map(player);
            assert_eq!(map.len(), 1);
            let system_first: &System = &map[0];
            assert_eq!(system_first.position.root, player);
            assert_eq!(system_first.position.position_x, 0);
            assert_eq!(system_first.position.position_y, 0);
        }

        #[ink::test]
        fn test_discovery() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let player: AccountId = accounts.alice;

            contract.register_player(player, String::from("Test"));

            contract.discover_system(player, SystemCoordinate {
                root: player,
                position_x: 1,
                position_y: 0,
            });
        }

        #[ink::test]
        fn test_map() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let player: AccountId = accounts.alice;

            contract.register_player(player, String::from("Test"));

            let map: Vec<System> = contract.get_universe_map(player);
            assert_eq!(map.len(), 1);
            let system: &System = &map[0];
            assert_eq!(system.position.root, player);
            assert_eq!(system.position.position_x, 0);
            assert_eq!(system.position.position_y, 0);
        }

        #[ink::test]
        fn test_gateways() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let alice: AccountId = accounts.alice;
            let bob: AccountId = accounts.bob;

            contract.register_player(alice, String::from("Alice"));
            contract.register_player(bob, String::from("Bob"));

            let alice_root_coord = SystemCoordinate {
                root: alice,
                position_x: 0,
                position_y: 0,
            };

            let bob_root_coord = SystemCoordinate {
                root: bob,
                position_x: 0,
                position_y: 0,
            };

            contract.build_gateway(alice, alice_root_coord);
            
            let alice_root = contract.get_system(alice_root_coord).unwrap();            
            let bob_root = contract.get_system(bob_root_coord).unwrap();

            assert!(alice_root.gateway_out.built);
            assert!(bob_root.gateway_in.built);

            let alice_second_coord = SystemCoordinate {
                root: alice,
                position_x: 1,
                position_y: 0,
            };

            contract.discover_system(alice, alice_second_coord);
            contract.build_gateway(alice, alice_second_coord);

            let alice_second = contract.get_system(alice_second_coord).unwrap();

            assert!(alice_second.gateway_out.built);

            let bob_second_coord = alice_second.gateway_out.target;
            let bob_second = contract.get_system(bob_second_coord).unwrap();

            assert!(alice_second.gateway_out.built);
            assert!(bob_second.gateway_in.built);
        }

        #[ink::test]
        fn test_attack_planet() {
            let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
            let accounts = default_accounts();
            let alice: AccountId = accounts.alice;
            let bob: AccountId = accounts.bob;

            contract.register_player(alice, String::from("Alice"));
            contract.register_player(bob, String::from("Bob"));

            let alice_root_coord = SystemCoordinate {
                root: alice,
                position_x: 0,
                position_y: 0,
            };
            let bob_root_coord = SystemCoordinate {
                root: bob,
                position_x: 0,
                position_y: 0,
            };

            assert!(!contract.can_attack_planet(alice, bob_root_coord));
            contract.build_gateway(alice, alice_root_coord);
            assert!(contract.can_attack_planet(alice, bob_root_coord));
        }
    }
}
