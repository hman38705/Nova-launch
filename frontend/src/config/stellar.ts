export const STELLAR_CONFIG = {
    network: import.meta.env.VITE_NETWORK || 'testnet',
    factoryContractId: import.meta.env.VITE_FACTORY_CONTRACT_ID || '',

    testnet: {
        networkPassphrase: 'Test SDF Network ; September 2015',
        horizonUrl: 'https://horizon-testnet.stellar.org',
        sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    },

    mainnet: {
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
        horizonUrl: 'https://horizon.stellar.org',
        sorobanRpcUrl: 'https://soroban-mainnet.stellar.org',
    },
} as const;

export const getNetworkConfig = (network: 'testnet' | 'mainnet' = 'testnet') => {
    return STELLAR_CONFIG[network];
};
