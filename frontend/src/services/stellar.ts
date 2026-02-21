import {
    Contract,
    SorobanRpc,
    TransactionBuilder,
    Networks,
    BASE_FEE,
    xdr,
    scValToNative,
    nativeToScVal,
    Address,
} from '@stellar/stellar-sdk';
import { STELLAR_CONFIG, getNetworkConfig } from '../config/stellar';
import type { TokenDeployParams, DeploymentResult, TokenInfo } from '../types';

export class StellarService {
    private server: SorobanRpc.Server;
    private networkPassphrase: string;
    private network: 'testnet' | 'mainnet';

    constructor(network: 'testnet' | 'mainnet' = 'testnet') {
        this.network = network;
        const config = getNetworkConfig(network);
        this.server = new SorobanRpc.Server(config.sorobanRpcUrl);
        this.networkPassphrase = config.networkPassphrase;
    }

    /**
     * Deploy a new token through the factory contract
     */
    async deployToken(params: TokenDeployParams, sourceAddress: string): Promise<DeploymentResult> {
        try {
            const contract = new Contract(STELLAR_CONFIG.factoryContractId);
            
            // Build contract invocation
            const operation = contract.call(
                'create_token',
                nativeToScVal(params.name, { type: 'string' }),
                nativeToScVal(params.symbol, { type: 'string' }),
                nativeToScVal(params.decimals, { type: 'u32' }),
                nativeToScVal(params.initialSupply, { type: 'i128' }),
                nativeToScVal(params.adminWallet, { type: 'address' }),
                nativeToScVal(this.calculateTotalFee(params), { type: 'i128' })
            );

            const account = await this.server.getAccount(sourceAddress);
            const transaction = new TransactionBuilder(account, {
                fee: BASE_FEE,
                networkPassphrase: this.networkPassphrase,
            })
                .addOperation(operation)
                .setTimeout(30)
                .build();

            // Simulate transaction
            const simulated = await this.server.simulateTransaction(transaction);
            if (SorobanRpc.Api.isSimulationError(simulated)) {
                throw new Error(`Simulation failed: ${simulated.error}`);
            }

            // Prepare transaction
            const prepared = SorobanRpc.assembleTransaction(transaction, simulated).build();

            return {
                tokenAddress: '', // Will be populated after signing and submission
                transactionHash: prepared.hash().toString('hex'),
                totalFee: this.calculateTotalFee(params).toString(),
                timestamp: Date.now(),
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Mint additional tokens to a recipient address
     * @param tokenAddress - The address of the deployed token contract
     * @param recipient - The address to receive the minted tokens
     * @param amount - The amount of tokens to mint (as string to handle large numbers)
     * @param adminAddress - The admin address authorized to mint tokens
     * @returns Transaction hash
     */
