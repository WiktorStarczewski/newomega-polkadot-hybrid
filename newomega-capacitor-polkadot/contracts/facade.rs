#![cfg_attr(not(feature = "std"), no_std)]
#![feature(destructuring_assignment)]

use ink_lang as ink;

/// The Delegator Contract
///
/// Manages all the other contracts, and acts as a facade to interact with them.
#[ink::contract(dynamic_storage_allocator = true)]
mod newomegadelegator {
    use newomega::NewOmega;
    use newomega::FightResult;
    use newomega::Move;
    use newomega::RunningEffect;
    use newomega::MAX_SHIPS;
    use newomega::ShipModule;
    use newomega::TargetingType;
    use newomegagame::NewOmegaGame;
    use newomegaranked::NewOmegaRanked;
    use newomegaranked::PlayerDefence;
    use newomegauniverse::NewOmegaUniverse;
    use newomegauniversestorage::System;
    use newomegauniversestorage::SystemCoordinate;
    use newomegauniversestorage::PlayerAssets;
    use newomegauniversestorage::Planet;
    use newomegauniversestorage::GameStats;
    use newomegauniversestorage::SystemId;
    use newomegastorage::NewOmegaStorage;
    use newomegastorage::PlayerData;
    use newomegastorage::MAX_MINERALS;
    use newomegastorage::RegisteredTrade;
    use newomegastorage::ModuleDefinition;
    use newomegaindustrial::NewOmegaIndustrial;
    use newomegatokens::TokenId;
    use newomegamarket::NewOmegaMarket;
    use newomegaquests::NewOmegaQuests;
    use newomegaquests::QuestProgress;
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
    // use ink_storage::{
    //     Lazy,
    // };
    use ink_lang::ToAccountId;

    /// Withdrawal error reasons definition
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum RewardWithdrawError {
        TransferFailed,
        InsufficientFunds,
        BelowSubsistenceThreshold,
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
    pub struct FreeActions {
        discovery: BlockNumber,
        task_claim: BlockNumber,
    }

    #[ink(storage)]
    pub struct NewOmegaDelegator {
        owner: AccountId,
        new_omega: NewOmega,
        new_omega_storage: NewOmegaStorage,
        new_omega_game: NewOmegaGame,
        new_omega_ranked: NewOmegaRanked,
        new_omega_universe: NewOmegaUniverse,
        new_omega_industrial: NewOmegaIndustrial,
        new_omega_market: NewOmegaMarket,
        new_omega_quests: NewOmegaQuests,
        free_discovery: StorageHashMap<AccountId, BlockNumber>,
        task_claim: StorageHashMap<AccountId, BlockNumber>,
    }

    #[ink(event)]
    pub struct RankedFightComplete {
        #[ink(topic)]
        attacker: AccountId,
        #[ink(topic)]
        defender: AccountId,
        result: FightResult,
        payout: Balance,
    }

    #[ink(event)]
    pub struct UniverseFightComplete {
        #[ink(topic)]
        attacker: AccountId,
        #[ink(topic)]
        defender: AccountId,
        result: FightResult,
        location: SystemCoordinate,
    }

    #[ink(event)]
    pub struct ModuleCrafted {
        #[ink(topic)]
        player: AccountId,
        #[ink(topic)]
        token_id: TokenId,
        definition: ModuleDefinition,
    }

    const FREE_DISCOVERY_FREQUENCY_BLOCKS: BlockNumber = 1000;
    const TASK_CLAIM_FREQUENCY_BLOCKS: BlockNumber = 28800;

    impl NewOmegaDelegator {
        /// Instantiates the Delegator.
        ///
        /// # Arguments
        ///
        /// * `new_omega` - Contract address: NewOmega
        /// * `new_omega_storage` - Contract address: NewOmegaStorage
        /// * `new_omega_game` - Contract address: NewOmegaGame
        /// * `new_omega_ranked` - Contract address: NewOmegaRanked
        /// * `new_omega_universe` - Contract address: NewOmegaUniverse
        #[ink(constructor)]
        pub fn new(
            new_omega: NewOmega,
            new_omega_storage: NewOmegaStorage,
            new_omega_game: NewOmegaGame,
            new_omega_ranked: NewOmegaRanked,
            new_omega_universe: NewOmegaUniverse,
            new_omega_industrial: NewOmegaIndustrial,
            new_omega_market: NewOmegaMarket,
            new_omega_quests: NewOmegaQuests) -> Self {

            Self {
                owner: Self::env().caller(),
                new_omega,
                new_omega_storage,
                new_omega_game,
                new_omega_ranked,
                new_omega_universe,
                new_omega_industrial,
                new_omega_market,
                new_omega_quests,
                free_discovery: StorageHashMap::default(),
                task_claim: StorageHashMap::default(),
            }
        }

        pub fn ensure_free_actions(&mut self, caller: AccountId) {
            self.free_discovery.entry(caller).or_insert(0);
            self.task_claim.entry(caller).or_insert(0);
        }

        /// Returns a fight replay (detailed fight description).
        ///
        /// # Arguments
        ///
        /// * `seed` - Seed used to generate randomness
        /// * `selection_lhs` - Attacker fleet composition (array with ship quantities)
        /// * `selection_rhs` - Defender fleet composition (array with ship quantities)
        /// * `modules_lhs` - An array that holds modules of the attacker fleet
        /// * `modules_rhs` - An array that holds modules of the defender fleet
        ///
        /// # Returns
        ///
        /// * `result` - A FightResult structure containing the result
        /// * `moves_lhs` - Logged moves of the attacker
        /// * `moves_rhs` - Logged moves of the defender
        #[ink(message)]
        pub fn replay(&self, seed: u64, selection_lhs: [u8; MAX_SHIPS],
            selection_rhs: [u8; MAX_SHIPS], modules_lhs: [ShipModule; MAX_SHIPS],
            modules_rhs: [ShipModule; MAX_SHIPS], targeting_lhs: TargetingType,
            targeting_rhs: TargetingType) -> (FightResult, Option<Vec<Move>>,
                Option<Vec<Move>>) {

            self.new_omega_game.fight(seed, true, selection_lhs, selection_rhs,
                modules_lhs, modules_rhs, targeting_lhs, targeting_rhs)
        }

        /// Returns a fight result (without detailed fight description).
        ///
        /// # Arguments
        ///
        /// * `seed` - Seed used to generate randomness
        /// * `selection_lhs` - Attacker fleet composition (array with ship quantities)
        /// * `selection_rhs` - Defender fleet composition (array with ship quantities)
        /// * `modules_lhs` - An array that holds modules of the attacker fleet
        /// * `modules_rhs` - An array that holds modules of the defender fleet
        ///
        /// # Returns
        ///
        /// * `result` - A FightResult structure containing the result
        /// * `moves_lhs` - Always returning None
        /// * `moves_rhs` - Always returning None
        #[ink(message)]
        pub fn replay_result(&self, seed: u64, selection_lhs: [u8; MAX_SHIPS],
            selection_rhs: [u8; MAX_SHIPS], modules_lhs: [ShipModule; MAX_SHIPS],
            modules_rhs: [ShipModule; MAX_SHIPS], targeting_lhs: TargetingType,
            targeting_rhs: TargetingType) -> (FightResult, Option<Vec<Move>>,
                Option<Vec<Move>>) {

            self.new_omega_game.fight(seed, false, selection_lhs, selection_rhs,
                modules_lhs, modules_rhs, targeting_lhs, targeting_rhs)
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

            assert_eq!(self.env().caller(), self.owner);
            self.new_omega_game.add_ship(cp, hp, attack_base,
                attack_variable, defence, speed, range);
        }

        /// Registers a fleet for Ranked Defence.
        ///
        /// # Arguments
        ///
        /// * `selection` - The fleet composition of the defence
        /// * `modules` - The modules of the defence
        /// * `name` - The defender name
        #[ink(message, payable)]
        pub fn register_defence(&mut self, selection: [u8; MAX_SHIPS],
            modules: [Option<TokenId>; MAX_SHIPS], name: String, targeting: TargetingType) {

            let caller: AccountId = self.env().caller();
            let value: Balance = self.env().transferred_balance();
            self.new_omega_ranked.register_defence(caller, selection,
                modules, name, value, targeting);
        }

        /// Unregisters a fleet from Ranked Defence.
        /// Transfers the Defence's balance back to the caller.
        #[ink(message)]
        pub fn unregister_defence(&mut self) {
            let caller: AccountId = self.env().caller();
            let self_balance: Balance = self.env().balance();

            let value: Balance = self.new_omega_ranked.unregister_defence(caller);

            assert!(value <= self_balance, "Insufficient funds!");

            match self.env().transfer(caller, value) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "Requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("Transfer failed!"),
                Ok(_) => {}
            }
        }

        #[ink(message)]
        pub fn admin_withdraw_funds(&mut self, value: Balance) {
            assert!(self.owner == self.env().caller());

            let self_balance: Balance = self.env().balance();
            assert!(value <= self_balance, "Insufficient funds!");

            match self.env().transfer(self.owner, value) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "Requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("Transfer failed!"),
                Ok(_) => {}
            }
        }

        /// Gets the registered defence of a player.
        /// Will panic if defence has not been registered for the player.
        ///
        /// # Returns
        ///
        /// * `defence` - The registered defence
        #[ink(message)]
        pub fn get_own_defence(&self) -> PlayerDefence {
            self.new_omega_ranked.get_own_defence(self.env().caller())
        }

        /// Gets all the registered defenders (all players).
        ///
        /// # Returns
        ///
        /// * `defenders` - The registered defenders
        #[ink(message)]
        pub fn get_all_defenders(&self) -> Vec<(AccountId, PlayerDefence)> {
            self.new_omega_ranked.get_all_defenders()
        }

        /// Calculates a ranked fight between caller and another player.
        ///
        /// # Arguments
        ///
        /// * `target` - account id of the defender
        /// * `selection` - Attacker fleet composition (array with ship quantities)
        /// * `modules` - An array that holds modules of the attacker fleet
        ///
        /// # Events
        ///
        /// * RankedFightComplete - when fight is complete
        #[ink(message, payable)]
        pub fn attack(&mut self, target: AccountId, selection: [u8; MAX_SHIPS],
            modules: [Option<TokenId>; MAX_SHIPS], targeting: TargetingType) {

            let caller: AccountId = self.env().caller();
            let result: FightResult;
            let transferred_balance: Balance = self.env().transferred_balance();
            let payout: Balance;

            (result, payout) = self.new_omega_ranked.attack(
                caller, target, selection, modules,
                transferred_balance, targeting);

            if result.rhs_dead && !result.lhs_dead {
                self.new_omega_quests.mark_ranked_win(caller);

                let self_balance: Balance = self.env().balance();
                assert!(transferred_balance <= self_balance, "Insufficient funds!");
    
                match self.env().transfer(caller, transferred_balance) {
                    Err(ink_env::Error::BelowSubsistenceThreshold) => {
                        panic!(
                            "Requested transfer would have brought contract\
                            below subsistence threshold!"
                        )
                    }
                    Err(_) => panic!("Transfer failed!"),
                    Ok(_) => {}
                }
            }

            self.env().emit_event(RankedFightComplete {
                attacker: caller,
                defender: target,
                result,
                payout,
            });
        }

        /// Gets the current ranked leaderboard.
        ///
        /// # Returns
        ///
        /// * `leaderboard` - A Vec containing a tuple of (player account id, player data)
        #[ink(message)]
        pub fn get_leaderboard(&self) -> Vec<(AccountId, PlayerData)> {
            self.new_omega_storage.get_leaderboard()
        }

        /// Gets caller's standing in the ranked leaderboard.
        ///
        /// # Returns
        ///
        /// * `ranked_entry` - A PlayerData structure with the leaderboard entry
        #[ink(message)]
        pub fn get_own_standing(&self) -> PlayerData {
            self.new_omega_storage.get_own_standing(self.env().caller())
        }

        #[ink(message)]
        pub fn get_system(&self, coord: SystemCoordinate) -> (Option<System>, bool) {
            self.new_omega_universe.get_system_check(self.env().caller(), coord)
        }

        #[ink(message)]
        pub fn ensure_discovery(&mut self) {
            let caller: AccountId = self.env().caller();
            self.ensure_free_actions(caller);
        }

        #[ink(message)]
        pub fn universe_register_player(&mut self, name: String) {
            let caller: AccountId = self.env().caller();
            let self_balance: Balance = self.env().balance();

            self.new_omega_universe.register_player(caller, name);
            self.ensure_free_actions(caller);

            let value: Balance = 20 * 1000000 * 1000000; // 20 units
            assert!(value <= self_balance, "Insufficient funds!");

            match self.env().transfer(caller, value) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "Requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("Transfer failed!"),
                Ok(_) => {}
            }
        }

        #[ink(message, payable)]
        pub fn discover_system(&mut self) {
            let caller = self.env().caller();
            let block_number = self.env().block_number();
            self.ensure_free_actions(caller);

            let free_discovery = self.free_discovery.get(&caller).unwrap();
            if block_number - free_discovery > FREE_DISCOVERY_FREQUENCY_BLOCKS {
                self.free_discovery.insert(caller, block_number);
            } else {
                let value: Balance = self.env().transferred_balance();
                assert_eq!(value, 1 * 1000000 * 1000000); // 1 Unit    
            }

            self.new_omega_universe.discover_system(caller);
            self.new_omega_quests.mark_discover(caller);
        }

        #[ink(message)]
        pub fn get_free_actions(&self) -> FreeActions {
            let caller = self.env().caller();

            assert!(self.free_discovery.get(&caller).is_some());
            assert!(self.task_claim.get(&caller).is_some());

            FreeActions {
                discovery: *self.free_discovery.get(&caller).unwrap(),
                task_claim: *self.task_claim.get(&caller).unwrap(),
            }
        }

        #[ink(message)]
        pub fn get_universe_map(&self, root: AccountId) -> Vec<System> {
            self.new_omega_universe.get_universe_map(root)
        }

        #[ink(message)]
        pub fn attack_planet(&mut self, target: SystemCoordinate, planet_id: u8,
            selection: [u8; MAX_SHIPS], modules: [Option<TokenId>; MAX_SHIPS], targeting: TargetingType) {

            let caller: AccountId = self.env().caller();
            let self_balance: Balance = self.env().balance();
            let result: FightResult;
            let previous_owner: AccountId;
            let (result, previous_owner) = self.new_omega_universe.attack_planet(
                caller,
                target,
                planet_id,
                selection,
                modules,
                targeting);

            if result.rhs_dead && !result.lhs_dead {
                self.new_omega_quests.mark_planet_capture(caller);

                let value: Balance = 1 * 1000000 * 100000; // 0.1 units
                assert!(value <= self_balance, "Insufficient funds!");
    
                match self.env().transfer(caller, value) {
                    Err(ink_env::Error::BelowSubsistenceThreshold) => {
                        panic!(
                            "Requested transfer would have brought contract\
                            below subsistence threshold!"
                        )
                    }
                    Err(_) => panic!("Transfer failed!"),
                    Ok(_) => {}
                }    
            }

            self.env().emit_event(UniverseFightComplete {
                attacker: caller,
                defender: previous_owner,
                result,
                location: target,
            });
        }

        #[ink(message)]
        pub fn get_player_assets(&self) -> PlayerAssets {
            self.new_omega_universe.get_player_assets(self.env().caller())
        }

        #[ink(message)]
        pub fn get_player_names(&self, players: Vec<AccountId>) -> Vec<String> {
            self.new_omega_universe.get_player_names(players)
        }

        #[ink(message)]
        pub fn build_gateway(&mut self, source: SystemCoordinate) {
            let caller = self.env().caller();
            self.new_omega_universe.build_gateway(caller, source);
            self.new_omega_quests.mark_build_gateway(caller);
        }

        #[ink(message)]
        pub fn get_game_stats(&self) -> GameStats {
            self.new_omega_universe.get_game_stats()
        }

        #[ink(message)]
        pub fn reinforce_planet(&mut self, target: SystemCoordinate,
            planet_id: u8, selection: [u8; MAX_SHIPS], modules: [Option<TokenId>; MAX_SHIPS],
            targeting: TargetingType) {

            let caller = self.env().caller();
            self.new_omega_universe.reinforce_planet(caller, target, planet_id,
                selection, modules, targeting);
        }

        #[ink(message)]
        pub fn get_player_minerals(&self) -> Vec<Balance> {
            self.new_omega_storage.get_player_minerals(self.env().caller())
        }

        #[ink(message, payable)]
        pub fn harvest(&mut self) {
            let caller = self.env().caller();
            let value: Balance = self.env().transferred_balance();
            assert_eq!(value, 1 * 1000000 * 1000000); // 1 Unit
            self.new_omega_universe.harvest(caller);
            self.new_omega_quests.mark_planet_harvest(caller);
        }

        #[ink(message)]
        pub fn harvest_planet(&mut self, target: SystemCoordinate, planet_id: u8) {
            let caller = self.env().caller();
            self.new_omega_universe.harvest_planet(caller, target, planet_id);
            self.new_omega_quests.mark_planet_harvest(caller);
        }

        #[ink(message)]
        pub fn get_trades(&self, caller: AccountId) -> [RegisteredTrade; MAX_MINERALS] {
            self.new_omega_storage.get_trades(caller)
        }

        #[ink(message)]
        pub fn register_trade(&mut self, resource_id: u8, trade: RegisteredTrade) {
            let caller = self.env().caller();
            self.new_omega_storage.register_trade(caller, resource_id, trade);
            self.new_omega_quests.mark_register_mineral_trade(caller);
        }

        #[ink(message)]
        pub fn trade(&mut self, target: AccountId, resource_id: u8, trade: RegisteredTrade) {
            self.new_omega_storage.trade(self.env().caller(), target, resource_id, trade);
        }

        #[ink(message)]
        pub fn produce_ships(&mut self, ship_id: u8, amount: Balance) {
            let caller = self.env().caller();
            self.new_omega_industrial.produce_ships(caller, ship_id, amount);
            self.new_omega_quests.mark_produce_ships(caller);
        }

        #[ink(message)]
        pub fn get_player_ships(&self) -> Vec<Balance> {
            self.new_omega_storage.get_player_ships(self.env().caller())
        }

        #[ink(message, payable)]
        pub fn rename_planet(&mut self, target: SystemCoordinate, planet_id: u8, name: String) {
            let value: Balance = self.env().transferred_balance();
            assert_eq!(value, 1 * 1000000 * 1000000); // 1 Unit
            self.new_omega_universe.rename_planet(self.env().caller(), target, planet_id, name);
        }

        #[ink(message, payable)]
        pub fn upgrade_planet(&mut self, target: SystemCoordinate, planet_id: u8) {
            let value: Balance = self.env().transferred_balance();
            assert_eq!(value, 2 * 1000000 * 1000000); // 2 Units
            self.new_omega_universe.upgrade_planet(target, planet_id);
            self.new_omega_quests.mark_upgrade_planet(target.root);
        }

        #[ink(message, payable)]
        pub fn craft_module(&mut self) {
            let caller = self.env().caller();
            let value: Balance = self.env().transferred_balance();
            assert_eq!(value, 1 * 1000000 * 1000000); // 1 Units
            
            let (token_id, definition) = self.new_omega_industrial.craft_module(caller);
            self.new_omega_quests.mark_module_craft(caller);

            self.env().emit_event(ModuleCrafted {
                player: caller,
                token_id,
                definition,
            });
        }

        #[ink(message)] 
        pub fn get_player_modules(&self) -> Vec<(TokenId, ModuleDefinition)> {
            self.new_omega_industrial.get_player_modules(self.env().caller())
        }

        #[ink(message)]
        pub fn register_module_sale(&mut self, token_id: TokenId, price: Balance) {
            self.new_omega_industrial.register_module_sale(self.env().caller(), token_id, price);
        }

        #[ink(message)]
        pub fn cancel_module_sale(&mut self, token_id: TokenId) {
            self.new_omega_industrial.cancel_module_sale(self.env().caller(), token_id);
        }

        #[ink(message)]
        pub fn get_all_auctions(&self) -> Vec<(AccountId, TokenId, Balance, ModuleDefinition)> {
            self.new_omega_industrial.get_all_auctions()
        }

        #[ink(message)]
        pub fn get_token_count(&self) -> TokenId {
            self.new_omega_industrial.get_token_count()
        }

        #[ink(message)]
        pub fn get_player_quest_progress(&self) -> QuestProgress {
            let caller = self.env().caller();
            self.new_omega_quests.get_player_progress(caller)
        }

        #[ink(message)]
        pub fn claim_quest(&mut self) {
            let caller = self.env().caller();
            let self_balance: Balance = self.env().balance();
            let block_number = self.env().block_number();
            let claim_available = self.task_claim.get(&caller).unwrap();

            assert!(block_number - claim_available > TASK_CLAIM_FREQUENCY_BLOCKS);

            self.task_claim.insert(caller, block_number);
            self.new_omega_quests.claim_quest(caller);

            let value: Balance = 5 * 1000000 * 1000000; // 5 units
            assert!(value <= self_balance, "Insufficient funds!");

            match self.env().transfer(caller, value) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "Requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("Transfer failed!"),
                Ok(_) => {}
            }    
        }

        #[ink(message)]
        pub fn destroy_module(&mut self, token_id: TokenId) {
            let caller = self.env().caller();
            self.new_omega_industrial.destroy_module(caller, token_id);
        }

        #[ink(message, payable)]
        pub fn buy_module_from_market(&mut self, seller: AccountId, token_id: TokenId) {
            let value = self.env().transferred_balance();
            let caller = self.env().caller();

            match self.new_omega_industrial.buy_module_from_market(
                caller, seller, token_id, value) {

                Err(_) => {
                    // Return the value
                    match self.env().transfer(caller, value) {
                        Err(ink_env::Error::BelowSubsistenceThreshold) => {
                            panic!(
                                "Requested transfer would have brought contract\
                                below subsistence threshold!"
                            )
                        }
                        Err(_) => panic!("Transfer failed!"),
                        Ok(_) => {}
                    }

                    panic!("Module purchase failed!");
                },
                Ok(_) => {}
            }

            match self.env().transfer(seller, value) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "Requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("Transfer failed!"),
                Ok(_) => {}
            }
        }
    }
}
