use soroban_sdk::{Address, Env};

use crate::types::{DataKey, FactoryState, TokenInfo, Stream, StreamStatus};

// Admin management
pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

// Treasury management
pub fn get_treasury(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Treasury).unwrap()
}

pub fn set_treasury(env: &Env, treasury: &Address) {
    env.storage().instance().set(&DataKey::Treasury, treasury);
}

// Fee management
pub fn get_base_fee(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::BaseFee).unwrap()
}

pub fn set_base_fee(env: &Env, fee: i128) {
    env.storage().instance().set(&DataKey::BaseFee, &fee);
}

pub fn get_metadata_fee(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::MetadataFee).unwrap()
}

pub fn set_metadata_fee(env: &Env, fee: i128) {
    env.storage().instance().set(&DataKey::MetadataFee, &fee);
}

// Token registry
pub fn get_token_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::TokenCount)
        .unwrap_or(0)
}

pub fn get_token_info(env: &Env, index: u32) -> Option<TokenInfo> {
    env.storage().instance().get(&DataKey::Token(index))
}

// Get factory state
pub fn get_factory_state(env: &Env) -> FactoryState {
    FactoryState {
        admin: get_admin(env),
        treasury: get_treasury(env),
        base_fee: get_base_fee(env),
        metadata_fee: get_metadata_fee(env),
    }
}

// Stream management
pub fn get_stream_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::StreamCount)
        .unwrap_or(0)
}

pub fn increment_stream_count(env: &Env) {
    let current = get_stream_count(env);
    env.storage().instance().set(&DataKey::StreamCount, &(current + 1));
}

pub fn get_stream(env: &Env, stream_id: &String) -> Option<Stream> {
    env.storage().persistent().get(&DataKey::Stream(stream_id.clone()))
}

pub fn set_stream(env: &Env, stream: &Stream) {
    env.storage().persistent().set(&DataKey::Stream(stream.stream_id.clone()), stream);
}
