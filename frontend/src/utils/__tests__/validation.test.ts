import { describe, it, expect } from 'vitest';
import {
    isValidStellarAddress,
    isValidTokenName,
    isValidTokenSymbol,
    isValidDecimals,
    isValidSupply,
    isValidImageFile,
    isValidDescription,
    validateTokenParams,
} from '../validation';

describe('validation utilities', () => {
    describe('isValidStellarAddress', () => {
        it('should accept valid Stellar addresses', () => {
            expect(isValidStellarAddress('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe(true);
            expect(isValidStellarAddress('GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ')).toBe(true);
        });

        it('should reject invalid Stellar addresses', () => {
            expect(isValidStellarAddress('invalid')).toBe(false);
            expect(isValidStellarAddress('AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe(false);
            expect(isValidStellarAddress('GXXX')).toBe(false);
            expect(isValidStellarAddress('')).toBe(false);
        });
    });

    describe('isValidTokenName', () => {
        it('should accept valid token names', () => {
            expect(isValidTokenName('My Token')).toBe(true);
            expect(isValidTokenName('Token123')).toBe(true);
            expect(isValidTokenName('A')).toBe(true);
        });

        it('should reject invalid token names', () => {
            expect(isValidTokenName('')).toBe(false);
            expect(isValidTokenName('a'.repeat(33))).toBe(false);
            expect(isValidTokenName('Token@123')).toBe(false);
        });
    });

    describe('isValidTokenSymbol', () => {
        it('should accept valid token symbols', () => {
            expect(isValidTokenSymbol('USD')).toBe(true);
            expect(isValidTokenSymbol('MYTOKEN')).toBe(true);
            expect(isValidTokenSymbol('A')).toBe(true);
        });

        it('should reject invalid token symbols', () => {
            expect(isValidTokenSymbol('')).toBe(false);
            expect(isValidTokenSymbol('usd')).toBe(false);
            expect(isValidTokenSymbol('USD123')).toBe(false);
            expect(isValidTokenSymbol('A'.repeat(13))).toBe(false);
        });
    });

    describe('isValidDecimals', () => {
        it('should accept valid decimals', () => {
            expect(isValidDecimals(0)).toBe(true);
            expect(isValidDecimals(7)).toBe(true);
            expect(isValidDecimals(18)).toBe(true);
        });

        it('should reject invalid decimals', () => {
            expect(isValidDecimals(-1)).toBe(false);
            expect(isValidDecimals(19)).toBe(false);
            expect(isValidDecimals(1.5)).toBe(false);
        });
    });

    describe('isValidSupply', () => {
        it('should accept valid supply values', () => {
            expect(isValidSupply('1')).toBe(true);
            expect(isValidSupply('1000000')).toBe(true);
            expect(isValidSupply('9007199254740991')).toBe(true);
        });

        it('should reject invalid supply values', () => {
            expect(isValidSupply('0')).toBe(false);
            expect(isValidSupply('-1')).toBe(false);
            expect(isValidSupply('invalid')).toBe(false);
            expect(isValidSupply('')).toBe(false);
        });
    });

    describe('isValidImageFile', () => {
        it('should accept valid image files', () => {
            const pngFile = new File([''], 'test.png', { type: 'image/png' });
            expect(isValidImageFile(pngFile).valid).toBe(true);

            const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
            expect(isValidImageFile(jpgFile).valid).toBe(true);
        });

        it('should reject invalid file types', () => {
            const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
            const result = isValidImageFile(txtFile);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PNG, JPG, or SVG');
        });

        it('should reject files that are too large', () => {
            const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.png', {
                type: 'image/png',
            });
            const result = isValidImageFile(largeFile);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('5MB');
        });
    });

    describe('isValidDescription', () => {
        it('should accept valid descriptions', () => {
            expect(isValidDescription('Short description')).toBe(true);
            expect(isValidDescription('a'.repeat(500))).toBe(true);
        });

        it('should reject descriptions that are too long', () => {
            expect(isValidDescription('a'.repeat(501))).toBe(false);
        });
    });

    describe('validateTokenParams', () => {
        it('should validate correct parameters', () => {
            const result = validateTokenParams({
                name: 'My Token',
                symbol: 'MTK',
                decimals: 7,
                initialSupply: '1000000',
                adminWallet: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            });
            expect(result.valid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('should return errors for invalid parameters', () => {
            const result = validateTokenParams({
                name: '',
                symbol: 'invalid',
                decimals: 20,
                initialSupply: '0',
                adminWallet: 'invalid',
            });
            expect(result.valid).toBe(false);
            expect(result.errors.name).toBeDefined();
            expect(result.errors.symbol).toBeDefined();
            expect(result.errors.decimals).toBeDefined();
            expect(result.errors.initialSupply).toBeDefined();
            expect(result.errors.adminWallet).toBeDefined();
        });
    });
});
