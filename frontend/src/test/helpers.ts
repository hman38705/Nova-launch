/**
 * Test helper utilities
 */

export const mockFile = (
    name: string = 'test.png',
    size: number = 1024,
    type: string = 'image/png'
): File => {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
};

export const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const mockWalletAddress = () =>
    'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export const mockTransactionHash = () =>
    'a'.repeat(64);

export const mockTokenAddress = () =>
    'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
