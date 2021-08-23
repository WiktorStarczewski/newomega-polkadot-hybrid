#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegauniversestorage::NewOmegaUniverseStorage;
pub use self::newomegauniversestorage::SystemCoordinate;
pub use self::newomegauniversestorage::Gateway;
pub use self::newomegauniversestorage::System;
pub use self::newomegauniversestorage::SystemId;
pub use self::newomegauniversestorage::Planet;
pub use self::newomegauniversestorage::PlayerAssets;
pub use self::newomegauniversestorage::GameStats;

/// Isolated storage for all things which should be considered player progress.
/// This module should only ever change if a serious API change is needed, but otherwise
/// it should survive most upgrades of the rest of the system, preserving the Game Board
/// (state of the game) across upgrades and bugfixes.
/// The only logic that belongs here is accessors for the storage.
#[ink::contract]
mod newomegauniversestorage {
    use newomega::ShipModule;
    use newomega::TargetingType;
    use newomega::MAX_SHIPS;
    use newomegatokens::TokenId;
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

    pub const MAX_PLANET_LEVEL: u8 = 100;

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
        pub no_players: u64,
        /// Number of systems
        pub no_systems: u64,
    }


    /// Describes a planet
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
        pub selection: [u8; MAX_SHIPS],
        /// Fleet modules
        pub modules: [Option<TokenId>; MAX_SHIPS],
        /// Targeting
        pub targeting: TargetingType,
        /// Level
        pub level: u8,
        /// Owner
        pub owner: AccountId,
        /// Type (0-MAX_PLANET_TYPES)
        pub planet_type: u8,
        /// Mineral type (0-MAX_MINERALS)
        pub mineral_type: u8,
        /// Mineral proof (0-100)
        pub mineral_proof: u8,
        /// Last harvested
        pub last_harvested: BlockNumber,
        /// Name
        pub name: Option<String>,
    }

    impl Default for Planet {
        fn default() -> Self {
            Planet {
                selection: [10; MAX_SHIPS],
                modules: [None; MAX_SHIPS],
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
    
    /// Describes a system coordinate
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
        pub system_id: SystemId,
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
        pub built: bool,
        pub target: SystemCoordinate,
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
        pub position: SystemCoordinate,
        /// Gateway in
        pub gateway_in: Gateway,
        /// Gateway out
        pub gateway_out: Gateway,
        /// Planets
        pub planets: Vec<Planet>,
        /// Discoverer
        pub discoverer: AccountId,
    }

    pub type SystemId = u64;

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
        pub name: String,
        pub last_system: SystemId,
    }

    #[ink(storage)]
    pub struct NewOmegaUniverseStorage {
        creator: AccountId,
        owners: StorageVec<AccountId>,
        systems: StorageHashMap<(AccountId, SystemId), System>,
        assets: StorageHashMap<AccountId, PlayerAssets>,
    }

    impl NewOmegaUniverseStorage {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                systems: StorageHashMap::default(),
                assets: StorageHashMap::default(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
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
            assert!(self.creator == self.env().caller());
            self.owners.push(delegator_address);
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

        #[ink(message)]
        pub fn is_registered(&self, caller: AccountId) -> bool {
            self.assets.get(&caller).is_some()
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
        #[ink(message)]
        pub fn get_system(&self, coord: SystemCoordinate) -> Option<System> {
            assert!(self.is_registered(coord.root));
            self.systems.get(&(coord.root, coord.system_id)).cloned()
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
            assert!(self.systems.get(&(coord.root, 0)).is_some());
            self.systems.get_mut(&(coord.root, coord.system_id)).unwrap()
        }

        #[ink(message)]
        pub fn get_asset(&self, caller: AccountId) -> PlayerAssets {
            assert!(self.is_registered(caller));
            let asset = self.assets.get(&caller).unwrap();

            PlayerAssets {
                name: asset.name.clone(),
                last_system: asset.last_system,
            }
        }

        #[ink(message)]
        pub fn add_system(&mut self, caller: AccountId, system_id: SystemId, system: System) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.systems.insert((caller, system_id), system);
        }

        #[ink(message)]
        pub fn add_asset(&mut self, caller: AccountId, asset: PlayerAssets) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.assets.insert(caller, asset);
        }

        #[ink(message)]
        pub fn increment_last_system(&mut self, caller: AccountId, amount: SystemId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            let asset = &mut self.assets.get_mut(&caller).unwrap();
            asset.last_system += amount;
        }

        #[ink(message)]
        pub fn update_planet_fleet(&mut self, target: SystemCoordinate, planet_id: u8, 
            selection: [u8; MAX_SHIPS], modules: [Option<TokenId>; MAX_SHIPS], targeting: TargetingType) {

            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            
            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];
            planet_mut.selection = selection;
            planet_mut.modules = modules;
            planet_mut.targeting = targeting;
        }

        #[ink(message)]
        pub fn update_planet_owner(&mut self, target: SystemCoordinate, planet_id: u8, owner: AccountId) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            
            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];
            planet_mut.owner = owner;
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
        pub fn rename_planet(&mut self, target: SystemCoordinate, planet_id: u8, name: String) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }
            assert!(self.systems.get(&(target.root, target.system_id)).is_some());

            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];
            planet_mut.name = Some(name);
        }

        /// Builds gateway out
        ///
        /// # Arguments
        ///
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        #[ink(message)]
        pub fn build_gateway_out(&mut self,
            target: SystemCoordinate, position: SystemCoordinate) {

            let mut system = self.get_system_mut(target);
            system.gateway_out.built = true;
            system.gateway_out.target = position;
        }

        /// Builds gateway in
        ///
        /// # Arguments
        ///
        /// * `caller` - AccountId of the connecting player (building gateway out)
        /// * `target` - SystemCoordinate of the System to build gateway in
        /// * `position` - The target of the gateway
        #[ink(message)]
        pub fn build_gateway_in(&mut self,
            target: SystemCoordinate, position: SystemCoordinate) {

            let mut system = self.get_system_mut(target);
            system.gateway_in.built = true;
            system.gateway_in.target = position;
        }

        /// Gets general game statistics
        ///
        /// # Returns
        ///
        /// * `stats` - The game statistics
        #[ink(message)]
        pub fn get_game_stats(&self) -> GameStats {
            GameStats {
                no_players: self.assets.keys().len() as u64,
                no_systems: self.systems.len() as u64,
            }
        }

        #[ink(message)]
        pub fn get_universe_map(&self, caller: AccountId) -> Vec<System> {
            assert!(self.assets.get(&caller).is_some());
            let asset: &PlayerAssets = self.assets.get(&caller).unwrap();
            let last_system_usize = asset.last_system as usize;

            let mut universe_map: Vec<System> = Vec::default();

            for i in 0..(last_system_usize + 1) {
                universe_map.push(self.systems.get(&(caller, i as SystemId)).unwrap().clone());
            }

            universe_map
        }

        #[ink(message)]
        pub fn update_planet_harvested(&mut self, target: SystemCoordinate, planet_id: u8, harvested: BlockNumber) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            let system = self.get_system_mut(target);
            let mut planet_mut = &mut system.planets[planet_id as usize];
            planet_mut.last_harvested = harvested;        
        }

        /// Upgrades a specific planet that the player owns
        ///
        /// # Arguments
        ///
        /// * `caller` - The player to upgrade planet for
        /// * `target`- SystemCoordinate of the system the planet to upgrade is in
        /// * `planet_id` - Which planet to upgrade
        #[ink(message)]
        pub fn update_planet_level(&mut self, target: SystemCoordinate, planet_id: u8, amount: u8) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            let system: &mut System = self.get_system_mut(target);
            let planet: &mut Planet = &mut system.planets[planet_id as usize];

            assert!(planet.level < MAX_PLANET_LEVEL);

            planet.level += amount;
        }

        #[ink(message)]
        pub fn get_player(&self, index: u64) -> AccountId {
            *self.assets
                .keys()
                .nth(index as usize)
                .unwrap()
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
        fn test_universestorage() {
            let mut contract = NewOmegaUniverseStorage::default();
            let accounts = default_accounts();

            let mut new_planet = Planet::default();
            new_planet.owner = accounts.alice;

            let root_coord = SystemCoordinate {
                root: accounts.alice,
                system_id: 0,
            };

            let new_system = System {
                position: root_coord,
                gateway_in: Gateway {
                    built: false,
                    target: SystemCoordinate {
                        root: AccountId::default(),
                        system_id: 0,
                    },
                },
                gateway_out: Gateway {
                    built: false,
                    target: SystemCoordinate {
                        root: AccountId::default(),
                        system_id: 0,
                    },
                },
                planets: vec![new_planet],
                discoverer: AccountId::default(),
            };

            contract.add_system(accounts.alice, 0, new_system);
            contract.add_asset(accounts.alice, PlayerAssets {
                name: String::from("Alice"),
                last_system: 0,
            });
            contract.update_planet_fleet(root_coord, 0, [20; MAX_SHIPS], [None; MAX_SHIPS], TargetingType::Closest);

            assert_eq!(contract.get_player(0), accounts.alice);

            let root_system = contract.get_system(root_coord).unwrap();
            assert_eq!(root_system.planets[0].selection, [20; MAX_SHIPS]);

            contract.update_planet_owner(root_coord, 0, accounts.bob);
            let root_system_after_owner_change = contract.get_system(root_coord).unwrap();
            assert_eq!(root_system_after_owner_change.planets[0].owner, accounts.bob);

            contract.rename_planet(root_coord, 0, String::from("Planet"));
            let root_system_after_rename = contract.get_system(root_coord).unwrap();
            assert_eq!(root_system_after_rename.planets[0].name, Some(String::from("Planet")));

            contract.update_planet_harvested(root_coord, 0, 1000);
            let root_system_after_harvested_update = contract.get_system(root_coord).unwrap();
            assert_eq!(root_system_after_harvested_update.planets[0].last_harvested, 1000);

            contract.update_planet_level(root_coord, 0, 4);
            let root_system_after_level = contract.get_system(root_coord).unwrap();
            assert_eq!(root_system_after_level.planets[0].level, 5);

            let gateway_coord = SystemCoordinate {
                root: accounts.bob,
                system_id: 0,
            };
            contract.build_gateway_out(root_coord, gateway_coord);
            let root_system_after_gateway = contract.get_system(root_coord).unwrap();
            assert!(root_system_after_gateway.gateway_out.built);
            assert_eq!(root_system_after_gateway.gateway_out.target, gateway_coord);

            let mut new_planet_bob = Planet::default();
            new_planet_bob.owner = accounts.bob;
            let new_system_bob = System {
                position: gateway_coord,
                gateway_in: Gateway {
                    built: false,
                    target: SystemCoordinate {
                        root: AccountId::default(),
                        system_id: 0,
                    },
                },
                gateway_out: Gateway {
                    built: false,
                    target: SystemCoordinate {
                        root: AccountId::default(),
                        system_id: 0,
                    },
                },
                planets: vec![new_planet_bob],
                discoverer: AccountId::default(),
            };

            contract.add_system(accounts.bob, 0, new_system_bob);
            contract.add_asset(accounts.bob, PlayerAssets {
                name: String::from("Bob"),
                last_system: 0,
            });

            contract.build_gateway_in(gateway_coord, root_coord);
            let root_bob_system = contract.get_system(gateway_coord).unwrap();
            assert!(root_bob_system.gateway_in.built);
            assert_eq!(root_bob_system.gateway_in.target, root_coord);
           
            let stats = contract.get_game_stats();
            assert_eq!(stats.no_players, 2);
            assert_eq!(stats.no_systems, 2);

            let map_alice = contract.get_universe_map(accounts.alice);
            assert_eq!(map_alice.len(), 1);
            let map_bob = contract.get_universe_map(accounts.bob);
            assert_eq!(map_bob.len(), 1);
        }
    }
}