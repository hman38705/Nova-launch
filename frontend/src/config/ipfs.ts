export const IPFS_CONFIG = {
    apiKey: import.meta.env.VITE_IPFS_API_KEY || '',
    apiSecret: import.meta.env.VITE_IPFS_API_SECRET || '',
    pinataApiUrl: 'https://api.pinata.cloud',
    pinataGateway: 'https://gateway.pinata.cloud/ipfs',
} as const;
