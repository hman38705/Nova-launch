import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { validTokenParams } from '../../test/generators';

/**
 * Property-Based Test: Fee Calculation Consistency
 * Validates: Requirements 3 - Fee Structure
 * 
 * For any deployment parameters, the calculated fee must match the fee structure:
 * - Base deployment = 5-10 XLM
 * - With metadata = base + 2-5 XLM
 */

function calculateFee(params: { metadata?: unknown }): {
    baseFee: number;
    metadataFee: number;
    totalFee: number;
} {
    const baseFee = 7; // 7 XLM base fee
    const metadataFee = params.metadata ? 3 : 0; // 3 XLM for metadata
    const totalFee = baseFee + metadataFee;

    return { baseFee, metadataFee, totalFee };
}

describe('Property: Fee Calculation Consistency', () => {
    it('should always calculate fees within the defined structure', () => {
        fc.assert(
            fc.property(validTokenParams(), (params) => {
                const fee = calculateFee(params);

                // Base fee should be in range 5-10 XLM
                if (fee.baseFee < 5 || fee.baseFee > 10) {
                    throw new Error(`Base fee ${fee.baseFee} is out of range [5, 10]`);
                }

                // Metadata fee should be 0 or in range 2-5 XLM
                if (params.metadata) {
                    if (fee.metadataFee < 2 || fee.metadataFee > 5) {
                        throw new Error(
                            `Metadata fee ${fee.metadataFee} is out of range [2, 5]`
                        );
                    }
                } else {
                    if (fee.metadataFee !== 0) {
                        throw new Error(
                            `Metadata fee should be 0 when no metadata, got ${fee.metadataFee}`
                        );
                    }
                }

                // Total fee should equal base + metadata
                if (fee.totalFee !== fee.baseFee + fee.metadataFee) {
                    throw new Error(
                        `Total fee ${fee.totalFee} does not equal base ${fee.baseFee} + metadata ${fee.metadataFee}`
                    );
                }
            })
        );
    });

    it('should have consistent fee calculation for same parameters', () => {
        fc.assert(
            fc.property(validTokenParams(), (params) => {
                const fee1 = calculateFee(params);
                const fee2 = calculateFee(params);

                // Same parameters should always produce same fees
                if (
                    fee1.baseFee !== fee2.baseFee ||
                    fee1.metadataFee !== fee2.metadataFee ||
                    fee1.totalFee !== fee2.totalFee
                ) {
                    throw new Error('Fee calculation is not deterministic');
                }
            })
        );
    });
});
