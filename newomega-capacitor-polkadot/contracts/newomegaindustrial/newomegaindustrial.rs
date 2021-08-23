#![feature(destructuring_assignment)]
#![feature(map_into_keys_values)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegaindustrial::NewOmegaIndustrial;

/// Evaluate `$x:expr` and if not true return `Err($y:expr)`.
///
/// Used as `ensure!(expression_to_ensure, expression_to_return_on_false)`.
macro_rules! ensure {
    ( $condition:expr, $error:expr $(,)? ) => {{
        if !$condition {
            return ::core::result::Result::Err(::core::convert::Into::into($error))
        }
    }};
}

#[ink::contract]
mod newomegaindustrial {
    use newomega::MAX_SHIPS;
    use newomega::Ship;
    use newomegastorage::NewOmegaStorage;
    use newomegastorage::MAX_MINERALS;
    use newomegastorage::ModuleDefinition;
    use newomegagame::NewOmegaGame;
    use newomegatokens::NewOmegaTokens;
    use newomegatokens::TokenId;
    use newomegatokens::Erc1155;
    use newomegamarket::NewOmegaMarket;
    use ink_prelude::vec::Vec;
    use ink_prelude::vec;
    use ink_lang::ToAccountId;
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

    pub const SHIP_COST_PER_CP: Balance = 10;
    pub const CRAFT_COST_RESOURCES: Balance = 10000;
    pub const MODULE_ROLLABLE_PROPERTIES: u8 = 6;

    #[derive(Debug, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum ModuleBuyError {
        UnexistentToken,
        SellerNotOwner,
        WrongPrice,
    }

    #[ink(storage)]
    pub struct NewOmegaIndustrial {
        creator: AccountId,
        owner: Option<AccountId>,
        new_omega_game: Option<newomegagame::NewOmegaGame>,
        new_omega_storage: Option<newomegastorage::NewOmegaStorage>,
        new_omega_tokens: Option<newomegatokens::NewOmegaTokens>,
        new_omega_market: Option<newomegamarket::NewOmegaMarket>,
    }

    impl NewOmegaIndustrial {
        #[ink(constructor)]
        pub fn new(new_omega_game: NewOmegaGame, new_omega_storage: NewOmegaStorage, new_omega_tokens: NewOmegaTokens,
            new_omega_market: NewOmegaMarket) -> Self {
            Self {
                creator: Self::env().caller(),
                owner: None,
                new_omega_game: Some(new_omega_game),
                new_omega_storage: Some(new_omega_storage),
                new_omega_tokens: Some(new_omega_tokens),
                new_omega_market: Some(new_omega_market),
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

        /// Generates a random seed
        ///
        /// # Returns
        ///
        /// * `u64` - The random seed
        pub fn generate_random_seed(&self, sub_seed: u8) -> u64 {
            let (hash, block_number) = self.env().random(&[sub_seed]);
            LittleEndian::read_u64(hash.as_ref())
        }

        pub fn roll_normal_cap(&self) -> u8 {
            let roll = self.generate_random_seed(0) % 100;

            // 0-50: 20%,  50-70: 30%, 70-85: 50%, 85-90: 60%, 90-95: 70%, 95-98: 80%, 99: 90%, 100: 100%
            if roll <= 50 {
                return 20;
            }
            if roll <= 70 {
                return 30; 
            }
            if roll <= 85 {
                return 50;
            }
            if roll <= 90 {
                return 60;
            }
            if roll <= 95 {
                return 70;
            }
            if roll <= 98 {
                return 80;
            }
            if roll <= 99 {
                return 90;
            }

            100
        }

        /// Generates a random module definition for a player
        ///
        /// # Arguments
        ///
        /// `caller` - AccountId of the player
        ///
        /// # Returns
        ///
        /// `definition` - The generated ModuleDefinition
        pub fn generate_module_definition(&self, caller: AccountId) -> ModuleDefinition {
            let mut definition = ModuleDefinition::default();
            definition.creator = caller;

            let normal_cap: u8 = self.roll_normal_cap();

            for i in 0..MODULE_ROLLABLE_PROPERTIES {
                let seed = self.generate_random_seed(i as u8);
                let effect_value = (seed % normal_cap as u64) as u8;

                match i {
                    0 => definition.module_stats.snare = effect_value,
                    1 => definition.module_stats.root = effect_value,
                    2 => definition.module_stats.blind = effect_value,
                    3 => definition.module_stats.attack_debuff = effect_value,
                    4 => definition.module_stats.defence_debuff = effect_value,
                    5 => definition.module_stats.range_debuff = effect_value,
                    _ => ()
                }
            }

            let seed = self.generate_random_seed(MODULE_ROLLABLE_PROPERTIES as u8);
            let boost: u8 = 100 - normal_cap;
            let boosted_stat = (seed % MODULE_ROLLABLE_PROPERTIES as u64) as u8;
            match boosted_stat {
                0 => definition.module_stats.snare += boost,
                1 => definition.module_stats.root += boost,
                2 => definition.module_stats.blind += boost,
                3 => definition.module_stats.attack_debuff += boost,
                4 => definition.module_stats.defence_debuff += boost,
                5 => definition.module_stats.range_debuff += boost,
                _ => ()
            }

            definition
        }

        /// Crafts a random module for a player
        ///
        /// # Arguments
        ///
        /// `caller` - AccountId of the player
        ///
        /// # Returns
        ///
        /// `definition` - The generated ModuleDefinition
        #[ink(message)]
        pub fn craft_module(&mut self, caller: AccountId) -> (TokenId, ModuleDefinition) {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            let minerals = self
                .new_omega_storage
                .as_ref()
                .unwrap()
                .get_player_minerals(caller);

            for i in 0..MAX_MINERALS {
                assert!(minerals[i] >= CRAFT_COST_RESOURCES, "Not enough minerals");
            }

            let definition = self.generate_module_definition(caller);

            let token_id = self.new_omega_tokens
                .as_mut()
                .unwrap()
                .create_for(1, caller);
            self.new_omega_storage
                .as_mut()
                .unwrap()
                .register_module_definition(token_id, definition);
            self.new_omega_storage
                .as_mut()
                .unwrap()
                .remove_minerals(caller, [CRAFT_COST_RESOURCES; MAX_MINERALS]);

            (token_id, definition)
        }

        #[ink(message)]
        pub fn destroy_module(&mut self, caller: AccountId, token_id: TokenId) {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            match self.new_omega_tokens
                .as_mut()
                .unwrap()
                .burn_for(token_id, 1, caller) {
                    Err(_) => {
                        panic!("Module transfer failed!");
                    },
                    Ok(_) => {}
                }
            self.new_omega_storage
                .as_mut()
                .unwrap()
                .unregister_module_definition(token_id);
            self.new_omega_storage
                .as_mut()
                .unwrap()
                .add_minerals(caller, [CRAFT_COST_RESOURCES / 2; MAX_MINERALS]);
        }

        #[ink(message)]
        pub fn get_player_modules(&self, caller: AccountId) -> Vec<(TokenId, ModuleDefinition)> {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            self.new_omega_tokens
                .as_ref()
                .unwrap()
                .get_all_tokens_for(caller)
                .iter()
                .filter_map(|entry| {
                    if *entry > ((MAX_MINERALS + MAX_SHIPS) as TokenId) {
                        // IMPROVEME make a batch get for module definitions
                        let definition = self.new_omega_storage
                            .as_ref()
                            .unwrap()
                            .get_module_definition(*entry);
                        Some((*entry, definition))
                    } else {
                        None
                    }
                })
                .collect()
        }

        /// Produces a given amount of a certain ship for a player
        ///
        /// # Arguments
        ///
        /// * `caller` - Account id of the player to produce ships for
        /// * `ship_id` - Which ship to produce (0..MAX_SHIPS)
        /// * `amount` - How many ships to produce
        #[ink(message)]
        pub fn produce_ships(&mut self, caller: AccountId, ship_id: u8, amount: Balance) {
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

            let cost_per_ship: Balance = (ships[ship_id_usize].cp as Balance) * SHIP_COST_PER_CP;
            let total_cost: Balance = amount * cost_per_ship;

            assert!(minerals[ship_id_usize] >= total_cost);

            let mut costs: [Balance; MAX_MINERALS] = [0; MAX_MINERALS];
            costs[ship_id_usize] = total_cost;

            let mut requested_ships: [Balance; MAX_SHIPS] = [0; MAX_SHIPS];
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

        #[ink(message)]
        pub fn get_all_auctions(&self) -> Vec<(AccountId, TokenId, Balance, ModuleDefinition)> {
            self.new_omega_market
                .as_ref()
                .unwrap()
                .get_all_auctions()
                .iter()
                .map(|entry| {
                    let (seller, token_id, price) = entry;
                    let definition = self.new_omega_storage
                        .as_ref()
                        .unwrap()
                        .get_module_definition(*token_id);

                    (*seller, *token_id, *price, definition)
                })
                .collect()
        }

        #[ink(message)]
        pub fn register_module_sale(&mut self, caller: AccountId, token_id: TokenId, price: Balance) -> Result<(), ModuleBuyError> {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            let balance = self.new_omega_tokens
                .as_ref()
                .unwrap()
                .balance_of(caller, token_id);

            ensure!(balance == 1, ModuleBuyError::SellerNotOwner);

            let owner_contract = self.new_omega_tokens.as_ref().unwrap();
            let owner_contract_account_id = owner_contract.to_account_id();

            match self.new_omega_tokens
                .as_mut()
                .unwrap()
                .safe_transfer_from(caller, owner_contract_account_id, token_id, 1, vec![]) {
                    Err(_) => {
                        panic!("Module transfer failed!");
                    },
                    Ok(_) => {}
                }

            self.new_omega_market
                .as_mut()
                .unwrap()
                .register_sale(caller, token_id, price);

            Ok(())
        }

        #[ink(message)]
        pub fn cancel_module_sale(&mut self, caller: AccountId, token_id: TokenId) {
            assert_eq!(self.env().caller(), self.owner.unwrap());

            let owner_contract = self.new_omega_tokens.as_ref().unwrap();
            let owner_contract_account_id = owner_contract.to_account_id();
            let balance = self.new_omega_tokens
                .as_ref()
                .unwrap()
                .balance_of(owner_contract_account_id, token_id);

            assert_eq!(balance, 1);
            
            let value = self.new_omega_market
                .as_ref()
                .unwrap()
                .get_sale(caller, token_id);

            match self.new_omega_tokens
                .as_mut()
                .unwrap()
                .safe_transfer_from(owner_contract_account_id, caller, token_id, 1, vec![]) {
                    Err(_) => {
                        panic!("Module transfer failed!");
                    },
                    Ok(_) => {}
                }

            self.new_omega_market
                .as_mut()
                .unwrap()
                .cancel_sale(caller, token_id);
        }

        #[ink(message)]
        pub fn buy_module_from_market(&mut self, caller: AccountId, seller: AccountId, token_id: TokenId, 
            transferred_value: Balance) -> Result<(), ModuleBuyError> {

            assert_eq!(self.env().caller(), self.owner.unwrap());

            let owner_contract = self.new_omega_tokens.as_ref().unwrap();
            let owner_contract_account_id = owner_contract.to_account_id();
            let balance = self.new_omega_tokens
                .as_ref()
                .unwrap()
                .balance_of(owner_contract_account_id, token_id);

            ensure!(balance == 1, ModuleBuyError::SellerNotOwner);

            let value = self.new_omega_market
                .as_ref()
                .unwrap()
                .get_sale(seller, token_id);

            ensure!(transferred_value == value, ModuleBuyError::WrongPrice);

            match self.new_omega_tokens
                .as_mut()
                .unwrap()
                .safe_transfer_from(owner_contract_account_id, caller, token_id, 1, vec![]) {
                    Err(_) => {
                        panic!("Module transfer failed!");
                    },
                    Ok(_) => {}
                }

            self.new_omega_market
                .as_mut()
                .unwrap()
                .cancel_sale(seller, token_id);

            Ok(())
        }

        #[ink(message)]
        pub fn get_token_count(&self) -> TokenId {
            self.new_omega_tokens
                .as_ref()
                .unwrap()
                .get_token_count()
        }
    }
}