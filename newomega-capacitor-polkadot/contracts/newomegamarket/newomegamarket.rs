#![feature(destructuring_assignment)]
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;
pub use self::newomegamarket::NewOmegaMarket;

#[ink::contract]
mod newomegamarket {
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

    #[ink(storage)]
    pub struct NewOmegaMarket {
        creator: AccountId,
        owners: StorageVec<AccountId>,
        entries: StorageHashMap<(AccountId, TokenId), Balance>,
    }

    impl NewOmegaMarket {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                entries: StorageHashMap::default(),
            }
        }

        #[ink(constructor)]
        pub fn default() -> Self {
            Self {
                creator: Self::env().caller(),
                owners: StorageVec::default(),
                entries: StorageHashMap::default(),
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
        pub fn authorise_industrial_contract(&mut self, industrial_address: AccountId) {
            assert!(self.creator == self.env().caller());
            self.owners.push(industrial_address);
        }

        #[ink(message)]
        pub fn register_sale(&mut self, caller: AccountId, token_id: TokenId, price: Balance) {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.entries
                .insert((caller, token_id), price);
        }

        #[ink(message)]
        pub fn get_sale(&self, seller: AccountId, token_id: TokenId) -> Balance {
            *self.entries
                .get(&(seller, token_id))
                .unwrap()
        }

        #[ink(message)]
        pub fn cancel_sale(&mut self, seller: AccountId, token_id: TokenId) -> Balance {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.entries
                .take(&(seller, token_id))
                .unwrap()
        }

        // IMPROVEME at least paginate this
        #[ink(message)]
        pub fn get_all_auctions(&self) -> Vec<(AccountId, TokenId, Balance)> {
            if self.owners.iter().len() > 0 {
                assert!(self.owners.iter().any(|owner| *owner == self.env().caller()));
            }

            self.entries
                .iter()
                .map(|entry| {
                    let (&key, &value) = entry;
                    let (account_id, token_id) = key;
                    (account_id, token_id, value)
                })
                .collect()
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
        fn test_market() {
            let mut contract = NewOmegaMarket::default();
            let accounts = default_accounts();

            contract.register_sale(accounts.alice, 0, 100);
            let sale = contract.get_sale(accounts.alice, 0);
            assert_eq!(sale, 100);

            let auctions = contract.get_all_auctions();
            assert_eq!(auctions.len(), 1);

            contract.cancel_sale(accounts.alice, 0);
            let auctions_after_cancel = contract.get_all_auctions();
            assert_eq!(auctions_after_cancel.len(), 0);
        }
    }
}
