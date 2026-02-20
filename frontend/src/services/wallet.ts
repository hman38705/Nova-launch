import {
    isConnected,
    getAddress,
    getNetwork,
    signTransaction,
    WatchWalletChanges,
} from '@stellar/freighter-api';

export class WalletService {
    static async isInstalled(): Promise<boolean> {
        try {
            const result = await isConnected();
            return !!result.isConnected;
        } catch {
            return false;
        }
    }

    static async getPublicKey(): Promise<string | null> {
        try {
            const result = await getAddress();
            return result.address || null;
        } catch {
            return null;
        }
    }

    static async getNetwork(): Promise<'testnet' | 'mainnet'> {
        try {
            const result = await getNetwork();
            const network = result.network || 'testnet';
            return network.toLowerCase().includes('public') ? 'mainnet' : 'testnet';
        } catch {
            return 'testnet';
        }
    }

    static async signTransaction(xdr: string, networkPassphrase?: string): Promise<string | null> {
        try {
            const result = await signTransaction(xdr, { networkPassphrase });
            return result.signedTxXdr || null;
        } catch (error) {
            console.error('Error signing transaction:', error);
            return null;
        }
    }

    static watchChanges(callback: (params: { address: string; network: string }) => void): () => void {
        const watcher = new WatchWalletChanges();
        watcher.watch((params) => {
            callback({
                address: params.address,
                network: params.network,
            });
        });
        return () => watcher.stop();
    }
}
