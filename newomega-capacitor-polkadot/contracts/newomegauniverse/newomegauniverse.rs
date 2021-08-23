#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegauniverse::NewOmegaUniverse;

#[ink::contract(dynamic_storage_allocator = true)]
mod newomegauniverse {
    use newomegagame::NewOmegaGame;
    use newomega::MAX_SHIPS;
    use newomega::FightResult;
    use newomega::ShipModule;
    use newomega::TargetingType;
    use newomegastorage::NewOmegaStorage;
    use newomegastorage::MAX_MINERALS;
    use newomegauniversestorage::NewOmegaUniverseStorage;
    use newomegauniversestorage::SystemCoordinate;
    use newomegauniversestorage::Gateway;
    use newomegauniversestorage::System;
    use newomegauniversestorage::SystemId;
    use newomegauniversestorage::Planet;
    use newomegauniversestorage::PlayerAssets;
    use newomegauniversestorage::GameStats;
    use newomegatokens::TokenId;
    use ink_prelude::vec::Vec;
    use ink_prelude::string::String;
    use ink_storage::{
        Box as StorageBox,
        Vec as StorageVec,
        collections::{
            HashMap as StorageHashMap,
        },
        traits::{
            PackedLayout,
            SpreadLayout,
        },
    };
    use byteorder::{ByteOrder, LittleEndian};

    pub const MAX_PLANETS: usize = 5;
    pub const MAX_PLANET_TYPES: usize = 20;
    pub const PLANETS_FOR_CONTROL: usize = 3;
    pub const MAX_HARVESTABLE_BLOCKS: BlockNumber = 24000;
    pub const MINERAL_GENERATION_BLOCKS: BlockNumber = 100;
    pub const START_WITH_PLANETS: usize = 3;

    #[ink(storage)]
    pub struct NewOmegaUniverse {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega_game: Option<newomegagame::NewOmegaGame>,
        new_omega_storage: Option<newomegastorage::NewOmegaStorage>,
        new_omega_universe_storage: Option<newomegauniversestorage::NewOmegaUniverseStorage>,
    }

    impl NewOmegaUniverse {
        #[ink(constructor)]
        pub fn new(new_omega_game: NewOmegaGame, new_omega_storage: NewOmegaStorage, 
            new_omega_universe_storage: NewOmegaUniverseStorage) -> Self {

            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: Some(new_omega_game),
                new_omega_storage: Some(new_omega_storage),
                new_omega_universe_storage: Some(new_omega_universe_storage),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: None,
                new_omega_storage: None,
                new_omega_universe_storage: None,
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

        pub fn is_registered(&self, caller: AccountId) -> bool {
            self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .is_registered(caller)
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
            self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_system(coord)
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
        pub fn generate_planet_type(&self, sub_seed: u8) -> u8 {
            let seed: u64 = self.generate_random_seed(sub_seed);
            (seed % MAX_PLANET_TYPES as u64) as u8
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
        pub fn generate_mineral_type(&self, sub_seed: u8) -> u8 {
            let seed: u64 = self.generate_random_seed(sub_seed);
            (seed % MAX_MINERALS as u64) as u8
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
        pub fn generate_mineral_proof(&self, sub_seed: u8) -> u8 {
            let seed: u64 = self.generate_random_seed(sub_seed);
            (seed % 100 as u64) as u8
        }

        /// Generates a random seed
        ///
        /// # Returns
        ///
        /// * `u64` - The random seed
        pub fn generate_random_seed(&self, sub_seed: u8) -> u64 {
            let (hash, _block_number) = self.env().random(&[sub_seed]);
            LittleEndian::read_u64(hash.as_ref())
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
                assert_eq!(self.env().caller(), self.owner.unwrap(), "Caller not owner");
            }
            assert!(!self.is_registered(caller), "Already registered");

            let new_position = SystemCoordinate {
                root: caller,
                system_id: 0,
            };
            let new_system = self.generate_new_system(new_position, caller, true);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .add_system(caller, 0, new_system);
            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .add_asset(caller, PlayerAssets {
                    name: name.clone(),
                    last_system: 0,
                });

            if self.new_omega_storage.is_some() {
                self.new_omega_storage  
                    .as_mut()
                    .unwrap()
                    .mint_initial_assets(caller);
                self.new_omega_storage
                    .as_mut()
                    .unwrap()
                    .ensure_trades(caller);
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
                    let asset = self.new_omega_universe_storage
                        .as_ref()
                        .unwrap()
                        .get_asset(player);
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
            planet_id: u8, selection: [u8; MAX_SHIPS], modules: [Option<TokenId>; MAX_SHIPS],
            targeting: TargetingType) {

            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }

            let system = self.get_system(target).unwrap();
            let planet = &system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);

            let mut planet_selection: [Balance; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                planet_selection[i] = Balance::from(planet.selection[i]);
            }
            let mut selection_bal: [Balance; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                selection_bal[i] = Balance::from(selection[i]);
            }
            let mut selection_needed: [u8; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                if selection[i] < planet.selection[i] {
                    selection_needed[i] = 0;
                } else {
                    selection_needed[i] = selection[i] - planet.selection[i];
                }
            }

            let has_enough = self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .has_enough_ships(caller, selection_needed);

            assert!(has_enough, "Not enough ships");

            self    
                .new_omega_storage
                .as_mut()
                .unwrap()
                .add_ships(caller, planet_selection);
            self    
                .new_omega_storage
                .as_mut()
                .unwrap()
                .remove_ships(caller, selection_bal);
            self
                .new_omega_universe_storage
                .as_mut()
                .unwrap()
                .update_planet_fleet(target, planet_id, selection, modules, targeting);
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
        pub fn generate_planets(&self, target: SystemCoordinate, start_ownership: bool, owner: AccountId) -> Vec<Planet> {
            let block_number = self.env().block_number();
            let mut new_planets: Vec<Planet> = Vec::default();
            for i in 0..MAX_PLANETS {
                let mut new_planet = Planet::default();
                let sub_seed = i as u8;
                new_planet.planet_type = self.generate_planet_type(sub_seed);
                new_planet.mineral_type = self.generate_mineral_type(sub_seed);
                new_planet.mineral_proof = self.generate_mineral_proof(sub_seed);
                new_planet.last_harvested = block_number;
                if start_ownership && i < START_WITH_PLANETS {
                    new_planet.owner = owner;
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
            let system = self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_system(target)
                .unwrap();
            let planet = &system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .rename_planet(target, planet_id, name);
        }

        pub fn generate_new_system(&self, target: SystemCoordinate, caller: AccountId, start_ownership: bool) -> System {
            let new_planets = self.generate_planets(target, start_ownership, caller);

            System {
                position: target,
                discoverer: caller,
                planets: new_planets,
                gateway_in: Gateway::default(),
                gateway_out: Gateway::default(),
            }
        }

        /// Discovers a given system for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the player making the discovery request
        /// * `target` - SystemCoordinate to discover a System in
        #[ink(message)]
        pub fn discover_system(&mut self, caller: AccountId) {
            if self.owner.is_some() {
                assert_eq!(self.env().caller(), self.owner.unwrap());
            }
            assert!(self.is_registered(caller));

            let new_system_id = self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_asset(caller)
                .last_system + 1;
            let new_system_coord = SystemCoordinate {
                root: caller,
                system_id: new_system_id,
            };
            let new_system = self.generate_new_system(new_system_coord, caller, false);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .add_system(caller, new_system_id, new_system);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .increment_last_system(caller, 1);
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
        pub fn get_random_gateway_target(&self, caller: AccountId) -> Option<AccountId> {
            let stats = self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_game_stats();
            let no_players = stats.no_players;

            if no_players < 2 {
                return None;
            }

            let seed: u64 = self.generate_random_seed((no_players % 100) as u8);
            let random = seed % no_players as u64;

            // One of (random, random - 1, random + 1) cant be the caller
            let mut account = self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_player(random);

            if account == caller {
                if random + 1 < no_players {
                    account = self.new_omega_universe_storage
                        .as_ref()
                        .unwrap()
                        .get_player(random + 1);
                } else {
                    // random - 1 is safe because we asserted there is at least 2 players
                    account = self.new_omega_universe_storage
                        .as_ref()
                        .unwrap()
                        .get_player(random - 1);
                }
            }

            Some(account)
        }

        /// Worker function for gateway out building
        ///
        /// # Arguments
        ///
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        pub fn build_gateway_out_worker(&mut self,
            target: SystemCoordinate, position: SystemCoordinate) {

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .build_gateway_out(target, position);
        }

        /// Worker function for gateway in building
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the connecting player (building gateway out)
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        pub fn build_gateway_in_worker(&mut self,
            target: SystemCoordinate, position: SystemCoordinate) {

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .build_gateway_in(target, position);
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
            assert!(self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_system(source)
                .is_some());

            let gateway_target = self.get_random_gateway_target(source.root).unwrap();
            let asset = self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_asset(gateway_target);
            let new_system_id = asset.last_system + 1;
            let new_system_coord = SystemCoordinate {
                root: gateway_target,
                system_id: new_system_id,
            };
            let new_system = self.generate_new_system(new_system_coord, gateway_target, false);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .increment_last_system(gateway_target, 1);

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .add_system(gateway_target, new_system_id, new_system);

            self.build_gateway_out_worker(source, new_system_coord);
            self.build_gateway_in_worker(new_system_coord, source);
        }

        /// Gets general game statistics
        ///
        /// # Returns
        ///
        /// * `stats` - The game statistics
        #[ink(message)]
        pub fn get_game_stats(&self) -> GameStats {
            self.new_omega_universe_storage 
                .as_ref()
                .unwrap()
                .get_game_stats()
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
        pub fn get_adjacent_system_coords(&self, system: &SystemCoordinate) -> Vec<SystemCoordinate> {
            let mut coords: Vec<SystemCoordinate> = Vec::default();

            coords.push(SystemCoordinate {
                root: system.root,
                system_id: system.system_id + 1,
            });

            if system.system_id > 0 {
                coords.push(SystemCoordinate {
                    root: system.root,
                    system_id: system.system_id - 1,
                });
            }

            coords
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
            let adjacent_systems_coords: Vec<SystemCoordinate> = self.get_adjacent_system_coords(&target);
            for adjacent_system_coords in adjacent_systems_coords {
                match self.get_system(adjacent_system_coords) {
                    Some(ref adjacent_system) =>
                        owner_found |= self.is_owner_of_system(caller, &adjacent_system),
                    _ => ()
                }
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
            self.new_omega_universe_storage 
                .as_ref()
                .unwrap()
                .get_asset(caller)
        }

        #[ink(message)]
        pub fn get_universe_map(&self, caller: AccountId) -> Vec<System> {
            self.new_omega_universe_storage 
                .as_ref()
                .unwrap()
                .get_universe_map(caller)
        }

        /// Harvest all planets in a players Universe, which the player owns
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to harvest planets for
        #[ink(message)]
        pub fn harvest(&mut self, caller: AccountId) {
            assert_eq!(self.env().caller(), self.owner.unwrap());
            assert!(self.is_registered(caller));

            let block_number = self.env().block_number();
            let mut harvested: [Balance; MAX_MINERALS] = [0; MAX_MINERALS];

            let last_system = (self.new_omega_universe_storage
                .as_ref()
                .unwrap()
                .get_asset(caller)
                .last_system) as usize;

            for i in 0..(last_system + 1) {
                let system_coord = SystemCoordinate {
                    root: caller,
                    system_id: i as SystemId,
                };
                let system = self.get_system(system_coord).unwrap();

                for planet_id in 0..MAX_PLANETS {
                    let planet = &system.planets[planet_id];

                    if planet.owner == caller {
                        let block_diff: BlockNumber = NewOmegaUniverse::min(block_number - planet.last_harvested, MAX_HARVESTABLE_BLOCKS);
                        let amount: Balance = (block_diff / MINERAL_GENERATION_BLOCKS) as Balance * planet.level as Balance * planet.mineral_proof as Balance;
                        harvested[planet.mineral_type as usize] += amount;

                        self.new_omega_universe_storage
                            .as_mut()
                            .unwrap()
                            .update_planet_harvested(system_coord, planet_id as u8, block_number);
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
            assert!(self.is_registered(caller), "Not registered");

            let block_number = self.env().block_number();
            let mut harvested: [Balance; MAX_MINERALS] = [0; MAX_MINERALS];

            let system = self.get_system(target).unwrap();
            let planet = &system.planets[planet_id as usize];

            assert_eq!(planet.owner, caller);

            let block_diff: BlockNumber = NewOmegaUniverse::min(block_number - planet.last_harvested, MAX_HARVESTABLE_BLOCKS);
            let amount: Balance = (block_diff / MINERAL_GENERATION_BLOCKS) as Balance * planet.level as Balance * planet.mineral_proof as Balance;
            harvested[planet.mineral_type as usize] += amount;

            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .update_planet_harvested(target, planet_id, block_number);

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
        pub fn upgrade_planet(&mut self, target: SystemCoordinate, planet_id: u8) {
            assert_eq!(self.env().caller(), self.owner.unwrap());
           
            self.new_omega_universe_storage
                .as_mut()
                .unwrap()
                .update_planet_level(target, planet_id, 1);
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
            modules: [Option<TokenId>; MAX_SHIPS],
            targeting: TargetingType) -> (FightResult, AccountId) {

            assert_eq!(self.env().caller(), self.owner.unwrap(), "Wrong delegator");
            assert!(self.can_attack_planet(caller, target), "Cant attack planet");
            assert!(self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .has_enough_ships(caller, selection), "Not enough ships");

            let seed: u64 = self.generate_random_seed(planet_id);
            let target_system_wrapped: Option<System> = self.get_system(target);

            assert!(target_system_wrapped.is_some(), "Target doesnt exist");

            let target_system: System = target_system_wrapped.unwrap();
            let target_planet = &target_system.planets[planet_id as usize];
            let previous_owner = target_planet.owner;

            let modules_decode = self.new_omega_storage
                .as_ref()
                .unwrap()
                .decode_modules(caller, modules);
            let target_modules_decode = self.new_omega_storage
                .as_ref()
                .unwrap()
                .decode_modules(target_planet.owner, target_planet.modules);

            // Calculate the fight result
            let (result, _lhs_moves, _rhs_moves) =
                self.new_omega_game.as_ref().unwrap().fight(
                    seed,
                    false,
                    selection,
                    target_planet.selection,
                    modules_decode,
                    target_modules_decode,
                    targeting,
                    target_planet.targeting);

            if result.rhs_dead && !result.lhs_dead {
                self.new_omega_universe_storage
                    .as_mut()
                    .unwrap()
                    .update_planet_owner(target, planet_id, caller);
                self.new_omega_universe_storage
                    .as_mut()
                    .unwrap()
                    .update_planet_fleet(
                        target, 
                        planet_id, 
                        [0; MAX_SHIPS],
                        [None; MAX_SHIPS],
                        TargetingType::default());
            }

            let mut ships_lost_bal: [Balance; MAX_SHIPS] = [0; MAX_SHIPS];
            for i in 0..MAX_SHIPS {
                ships_lost_bal[i] = result.ships_lost_lhs[i] as Balance;
            }

            self
                .new_omega_storage
                .as_mut()
                .unwrap()
                .remove_ships(caller, ships_lost_bal);

            (result, previous_owner)
        }
    }
    
    // #[cfg(test)]
    // mod tests {
    //     use super::*;
    //     use ink_env::{
    //         test,
    //     };
    //     use ink_lang as ink;
    //     type Accounts = test::DefaultAccounts<Environment>;

    //     fn default_accounts() -> Accounts {
    //         test::default_accounts()
    //             .expect("Test environment is expected to be initialized.")
    //     }

    //     #[ink::test]
    //     fn test_register() {
    //         let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
    //         let accounts = default_accounts();
    //         let player: AccountId = accounts.alice;

    //         contract.register_player(player, String::from("Test"));

    //         let system = contract.get_system(SystemCoordinate {
    //             root: player,
    //             system_id: 0,
    //         });
    //         assert!(system.is_some());

    //         let system_unwrapped = system.unwrap();
    //         assert_eq!(system_unwrapped.position.root, player);
    //         assert_eq!(system_unwrapped.position.system_id, 0);
    //         assert_eq!(system_unwrapped.planets[0].selection, [10; 4]);
    //         assert_eq!(system_unwrapped.planets[3].selection, [10; 4]);
    //         assert_eq!(system_unwrapped.planets[0].owner, player);
    //         assert_eq!(system_unwrapped.planets[1].owner, player);
    //         assert_eq!(system_unwrapped.planets[2].owner, player);
    //         assert_eq!(system_unwrapped.planets[3].owner, AccountId::default());
    //         assert_eq!(system_unwrapped.planets[4].owner, AccountId::default());
    //     }

    //     #[ink::test]
    //     fn test_systems() {
    //         let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
    //         let accounts = default_accounts();
    //         let player: AccountId = accounts.alice;

    //         contract.register_player(player, String::from("Test"));

    //         let system: Option<System> = contract.get_system(SystemCoordinate {
    //             root: player,
    //             system_id: 1,
    //         });
    //         assert!(system.is_none());
    //     }

    //     #[ink::test]
    //     fn test_discovery() {
    //         let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
    //         let accounts = default_accounts();
    //         let player: AccountId = accounts.alice;

    //         contract.register_player(player, String::from("Test"));
    //         contract.discover_system(player);
    //     }

    //     #[ink::test]
    //     fn test_gateways() {
    //         let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
    //         let accounts = default_accounts();
    //         let alice: AccountId = accounts.alice;
    //         let bob: AccountId = accounts.bob;

    //         contract.register_player(alice, String::from("Alice"));
    //         contract.register_player(bob, String::from("Bob"));

    //         let alice_root_coord = SystemCoordinate {
    //             root: alice,
    //             system_id: 0,
    //         };

    //         let bob_root_coord = SystemCoordinate {
    //             root: bob,
    //             system_id: 0,
    //         };

    //         let bob_second_coord = SystemCoordinate {
    //             root: bob,
    //             system_id: 1,
    //         };

    //         contract.build_gateway(alice, alice_root_coord);
    //         let alice_root = contract.get_system(alice_root_coord).unwrap();            
    //         let bob_root = contract.get_system(bob_root_coord).unwrap();

    //         let bob_second = contract.get_system(bob_second_coord).unwrap();            
    //         assert!(alice_root.gateway_out.built);
    //         assert!(bob_second.gateway_in.built);

    //         let alice_second_coord = SystemCoordinate {
    //             root: alice,
    //             system_id: 1,
    //         };

    //         contract.discover_system(alice);
    //         contract.build_gateway(alice, alice_second_coord);

    //         let alice_second = contract.get_system(alice_second_coord).unwrap();

    //         assert!(alice_second.gateway_out.built);

    //         let bob_second_coord = alice_second.gateway_out.target;
    //         let bob_second = contract.get_system(bob_second_coord).unwrap();

    //         assert!(alice_second.gateway_out.built);
    //         assert!(bob_second.gateway_in.built);
    //     }

    //     #[ink::test]
    //     fn test_attack_planet() {
    //         let mut contract: NewOmegaUniverse = NewOmegaUniverse::default();
    //         let accounts = default_accounts();
    //         let alice: AccountId = accounts.alice;
    //         let bob: AccountId = accounts.bob;

    //         contract.register_player(alice, String::from("Alice"));
    //         contract.register_player(bob, String::from("Bob"));

    //         let names = &contract.get_player_names(vec![alice, bob]);
    //         assert_eq!(names, &vec![String::from("Alice"), String::from("Bob")]);

    //         let alice_root_coord = SystemCoordinate {
    //             root: alice,
    //             system_id: 0,
    //         };
    //         let bob_root_coord = SystemCoordinate {
    //             root: bob,
    //             system_id: 0,
    //         };

    //         assert!(!contract.can_attack_planet(alice, bob_root_coord));
    //         contract.build_gateway(alice, alice_root_coord);

    //         let bob_second_coord = SystemCoordinate {
    //             root: bob,
    //             system_id: 1,
    //         };
    //         let bob_second = contract.get_system(bob_second_coord).unwrap();
    //         assert!(contract.can_attack_planet(alice, bob_second_coord));
    //     }
    // }
}
