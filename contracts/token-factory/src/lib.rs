#![no_std]

mod events;
mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, Address, Env, String, token};
use types::{Error, FactoryState, TokenInfo, StreamCreatedV1, Stream, StreamStatus, StreamCancelledV1, StreamClaimedV1};

#[contract]
pub struct TokenFactory;

#[contractimpl]
impl TokenFactory {
    /// Initialize the factory with admin, treasury, and fee structure
    pub fn initialize(
        env: Env,
        admin: Address,
        treasury: Address,
        base_fee: i128,
        metadata_fee: i128,
    ) -> Result<(), Error> {
        // Check if already initialized
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }

        // Validate parameters
        if base_fee < 0 || metadata_fee < 0 {
            return Err(Error::InvalidParameters);
        }

        // Set initial state
        storage::set_admin(&env, &admin);
        storage::set_treasury(&env, &treasury);
        storage::set_base_fee(&env, base_fee);
        storage::set_metadata_fee(&env, metadata_fee);

        Ok(())
    }

    /// Get the current factory state
    pub fn get_state(env: Env) -> FactoryState {
        storage::get_factory_state(&env)
    }

    /// Update fee structure (admin only)
    pub fn update_fees(
        env: Env,
        admin: Address,
        base_fee: Option<i128>,
        metadata_fee: Option<i128>,
    ) -> Result<(), Error> {
        admin.require_auth();

        let current_admin = storage::get_admin(&env);
        if admin != current_admin {
            return Err(Error::Unauthorized);
        }

        if let Some(fee) = base_fee {
            if fee < 0 {
                return Err(Error::InvalidParameters);
            }
            storage::set_base_fee(&env, fee);
        }

        if let Some(fee) = metadata_fee {
            if fee < 0 {
                return Err(Error::InvalidParameters);
            }
            storage::set_metadata_fee(&env, fee);
        }

        Ok(())
    }

    /// Get token count
    pub fn get_token_count(env: Env) -> u32 {
        storage::get_token_count(&env)
    }

    /// Get token info by index
    pub fn get_token_info(env: Env, index: u32) -> Result<TokenInfo, Error> {
        storage::get_token_info(&env, index).ok_or(Error::TokenNotFound)
    }

    /// Create a new token stream and emit stream_created event
    /// 
    /// # Arguments
    /// - `env`: The contract environment
    /// - `creator`: The address creating the stream
    /// - `beneficiary`: The address that will receive streamed tokens
    /// - `token_address`: The token being streamed
    /// - `total_amount`: Total amount of tokens to stream
    /// - `start_time`: Timestamp when streaming begins
    /// - `duration_seconds`: Duration of the stream in seconds
    /// 
    /// # Events Emitted
    /// - `stream_created_v1`: StreamCreatedV1 event with versioned payload
    /// 
    /// # Returns
    /// - `Ok(stream_id)`: The unique identifier for the created stream
    /// - `Err(Error)`: If creation fails (insufficient funds, invalid params, etc.)
    pub fn create_stream(
        env: Env,
        creator: Address,
        beneficiary: Address,
        token_address: Address,
        total_amount: i128,
        start_time: u64,
        duration_seconds: u64,
    ) -> Result<String, Error> {
        creator.require_auth();

        // Validate parameters
        if total_amount <= 0 || duration_seconds == 0 {
            return Err(Error::InvalidParameters);
        }

        // Generate stream ID (in real implementation, would use storage counter)
        let stream_count = storage::get_stream_count(&env);
        let stream_id = String::from_small_str(&format!("stream_{}", stream_count));

        // Transfer tokens from creator to contract
        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&creator, &env.current_contract_address(), &total_amount);

        // Create stream object
        let stream = Stream {
            stream_id: stream_id.clone(),
            creator: creator.clone(),
            beneficiary: beneficiary.clone(),
            token_address: token_address.clone(),
            total_amount,
            start_time,
            duration_seconds,
            claimed_amount: 0,
            status: StreamStatus::Active,
            created_at: env.ledger().timestamp(),
            last_claim_at: None,
            claim_count: 0,
        };

        // Store the stream
        storage::set_stream(&env, &stream);
        storage::increment_stream_count(&env);

        // Emit stream_created event with versioned schema
        let event = StreamCreatedV1 {
            event_version: 1,
            timestamp: env.ledger().timestamp(),
            stream_id: stream_id.clone(),
            creator: creator.clone(),
            beneficiary: beneficiary.clone(),
            token_address: token_address.clone(),
            total_amount,
            start_time,
            duration_seconds,
        };

        events::emit_stream_created(&env, event);

        Ok(stream_id)
    }

    /// Claim vested tokens from a stream
    /// 
    /// # Arguments
    /// - `env`: The contract environment
    /// - `claimer`: The address claiming tokens (must be beneficiary)
    /// - `stream_id`: The stream ID to claim from
    /// 
    /// # Returns
    /// - `Ok(claimed_amount)`: Amount successfully claimed
    /// - `Err(Error)`: If claim fails
    pub fn claim_stream(env: Env, claimer: Address, stream_id: String) -> Result<i128, Error> {
        claimer.require_auth();

        // Get stream
        let mut stream = storage::get_stream(&env, &stream_id)
            .ok_or(Error::StreamNotFound)?;

        // Validate claimer is beneficiary
        if claimer != stream.beneficiary {
            return Err(Error::Unauthorized);
        }

        // Check stream is active
        if stream.status != StreamStatus::Active {
            return Err(Error::StreamNotActive);
        }

        // Calculate vested amount
        let current_time = env.ledger().timestamp();
        let vested_amount = Self::calculate_vested_amount(&stream, current_time);
        let claimable_amount = vested_amount - stream.claimed_amount;

        if claimable_amount <= 0 {
            return Ok(0);
        }

        // Transfer tokens
        let token_client = token::Client::new(&env, &stream.token_address);
        token_client.transfer(&env.current_contract_address(), &claimer, &claimable_amount);

        // Update stream
        stream.claimed_amount += claimable_amount;
        stream.last_claim_at = Some(current_time);
        stream.claim_count += 1;

        // Check if stream is completed
        if stream.claimed_amount >= stream.total_amount {
            stream.status = StreamStatus::Completed;
        }

        storage::set_stream(&env, &stream);

        // Emit claim event
        let event = StreamClaimedV1 {
            event_version: 1,
            timestamp: current_time,
            stream_id: stream_id.clone(),
            claimer,
            claimed_amount: claimable_amount,
            remaining_amount: stream.total_amount - stream.claimed_amount,
            claim_count: stream.claim_count,
        };

        events::emit_stream_claimed(&env, event);

        Ok(claimable_amount)
    }

    /// Cancel a stream and distribute vested vs unvested amounts
    /// 
    /// # Arguments
    /// - `env`: The contract environment
    /// - `canceller`: The address cancelling the stream (must be creator or admin)
    /// - `stream_id`: The stream ID to cancel
    /// 
    /// # Returns
    /// - `Ok((beneficiary_received, creator_refunded))`: Amounts distributed
    /// - `Err(Error)`: If cancellation fails
    pub fn cancel_stream(env: Env, canceller: Address, stream_id: String) -> Result<(i128, i128), Error> {
        canceller.require_auth();

        // Get stream
        let mut stream = storage::get_stream(&env, &stream_id)
            .ok_or(Error::StreamNotFound)?;

        // Validate canceller is creator or admin
        let admin = storage::get_admin(&env);
        if canceller != stream.creator && canceller != admin {
            return Err(Error::Unauthorized);
        }

        // Check stream is not already cancelled/completed
        if stream.status == StreamStatus::Cancelled || stream.status == StreamStatus::Completed {
            return Err(Error::StreamNotActive);
        }

        // Calculate vested amount at current time
        let current_time = env.ledger().timestamp();
        let vested_amount = Self::calculate_vested_amount(&stream, current_time);
        
        // Beneficiary gets vested amount minus already claimed
        let beneficiary_amount = vested_amount - stream.claimed_amount;
        let creator_refund = stream.total_amount - vested_amount;

        // Transfer to beneficiary if there's unclaimed vested amount
        if beneficiary_amount > 0 {
            let token_client = token::Client::new(&env, &stream.token_address);
            token_client.transfer(&env.current_contract_address(), &stream.beneficiary, &beneficiary_amount);
        }

        // Refund creator
        if creator_refund > 0 {
            let token_client = token::Client::new(&env, &stream.token_address);
            token_client.transfer(&env.current_contract_address(), &stream.creator, &creator_refund);
        }

        // Update stream status
        stream.status = StreamStatus::Cancelled;
        storage::set_stream(&env, &stream);

        // Emit cancellation event
        let event = StreamCancelledV1 {
            event_version: 1,
            timestamp: current_time,
            stream_id: stream_id.clone(),
            canceller,
            beneficiary_received: beneficiary_amount,
            creator_refunded: creator_refund,
            cancellation_reason: String::from_small_str("manual_cancel"),
        };

        events::emit_stream_cancelled(&env, event);

        Ok((beneficiary_amount, creator_refund))
    }

    /// Calculate vested amount for a stream at a given time
    fn calculate_vested_amount(stream: &Stream, current_time: u64) -> i128 {
        if current_time <= stream.start_time {
            return 0;
        }

        let elapsed = current_time - stream.start_time;
        if elapsed >= stream.duration_seconds {
            return stream.total_amount;
        }

        // Linear vesting: amount * elapsed / duration
        (stream.total_amount * elapsed as i128) / stream.duration_seconds as i128
    }
}

#[cfg(test)]
mod test;

#[cfg(test)]
mod event_tests;

#[cfg(test)]
mod fuzz_test;

#[cfg(test)]
mod bench_test;

#[cfg(test)]
mod supply_conservation_test;
