import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * SettlePay / HealthPay GraphQL Client
 *
 * Connects to HealthPay's GraphQL API at https://sword.beta.healthpay.tech/graphql
 * All mutations and queries match the official Postman collection (13 endpoints).
 *
 * Authentication flow:
 *   1. authMerchant(apiKey) → merchant bearer token
 *   2. loginUser(mobile, firstName, lastName) → sends SMS OTP
 *   3. authUser(mobile, otp, isProvider) → userToken for wallet operations
 *
 * Wallet operations (all require userToken):
 *   - topupWalletUser → returns iframeUrl for Fawry/Card payment
 *   - deductFromUser → merchant-initiated deduction from user wallet
 *   - sendPaymentRequest → push payment request to user (auto-deducts on accept)
 *   - payToUser → merchant-to-user transfer (refunds, cashback)
 *   - userWallet → get user balance and transaction history
 *   - userPaymentRequests → list pending/completed payment requests
 *   - logoutUser → invalidate userToken
 */
@Injectable()
export class SettlePayClient implements OnModuleInit {
  private readonly logger = new Logger(SettlePayClient.name);
  private client: AxiosInstance;
  private merchantToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private readonly API_URL: string;
  private readonly API_HEADER: string;
  private readonly API_KEY: string;

  constructor(private config: ConfigService) {
    this.API_URL = config.get('SETTLEPAY_API_URL', 'https://sword.beta.healthpay.tech/graphql');
    this.API_HEADER = config.get('SETTLEPAY_API_HEADER', 'H_HealthPayB');
    this.API_KEY = config.get('SETTLEPAY_API_KEY', 'k_001HealthPayB');

    this.client = axios.create({
      baseURL: this.API_URL,
      headers: {
        'Content-Type': 'application/json',
        'api-header': this.API_HEADER,
      },
      timeout: 15000,
    });
  }

  async onModuleInit() {
    try {
      await this.authMerchant();
      this.logger.log('HealthPay API connected — merchant authenticated');
    } catch (err) {
      this.logger.warn(`HealthPay API connection failed — wallet features unavailable: ${err}`);
    }
  }

  // ===================================================================
  // AUTHENTICATION
  // ===================================================================

  /**
   * Step 1: Authenticate merchant with API key.
   * Returns a bearer token for all subsequent requests.
   */
  async authMerchant(): Promise<string> {
    if (this.merchantToken && Date.now() < this.tokenExpiresAt) {
      return this.merchantToken;
    }

    const result = await this.executeRaw(`
      mutation authMerchant($apiKey: String!) {
        authMerchant(apiKey: $apiKey) {
          token
        }
      }
    `, { apiKey: this.API_KEY });

    this.merchantToken = result.authMerchant?.token;
    if (!this.merchantToken) {
      throw new Error('HealthPay authMerchant failed — no token returned');
    }
    this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
    this.logger.log('HealthPay merchant token refreshed');
    return this.merchantToken;
  }

  /**
   * Step 2: Register/login a user by mobile number.
   * Sends an SMS OTP to the user's phone.
   * Returns the user's uid.
   */
  async loginUser(mobile: string, firstName: string, lastName: string, email?: string): Promise<{ uid: string }> {
    const result = await this.execute(`
      mutation loginUser($mobile: String!, $lastName: String!, $firstName: String!, $email: String) {
        loginUser(mobile: $mobile, lastName: $lastName, firstName: $firstName, email: $email) {
          uid
        }
      }
    `, { mobile, firstName, lastName, email });

    return result.loginUser;
  }

  /**
   * Step 3: Verify OTP and get a userToken for wallet operations.
   * isProvider=true for merchants/providers, false for regular customers.
   */
  async authUser(mobile: string, otp: string, isProvider: boolean = false): Promise<{ userToken: string; user: { uid: string } }> {
    const result = await this.execute(`
      mutation authUser($mobile: String!, $otp: String!, $isProvider: Boolean!) {
        authUser(mobile: $mobile, otp: $otp, isProvider: $isProvider) {
          userToken
          user {
            uid
          }
        }
      }
    `, { mobile, otp, isProvider });

    return result.authUser;
  }

  /**
   * Logout user — invalidates the userToken.
   */
  async logoutUser(userToken: string): Promise<{ isSuccess: boolean }> {
    const result = await this.execute(`
      mutation logoutUser($userToken: String!) {
        logoutUser(userToken: $userToken) {
          isSuccess
        }
      }
    `, { userToken });

    return result.logoutUser;
  }

  // ===================================================================
  // WALLET OPERATIONS
  // ===================================================================

  /**
   * Top up a user's wallet. Returns an iframeUrl for the payment gateway
   * (Fawry, card, etc.). The user completes payment in the iframe,
   * and HealthPay sends a webhook notification on completion.
   */
  async topupWalletUser(userToken: string, amount: number): Promise<{ uid: string; iframeUrl: string }> {
    const result = await this.execute(`
      mutation topupWalletUser($userToken: String!, $amount: Float!) {
        topupWalletUser(userToken: $userToken, amount: $amount) {
          uid
          iframeUrl
        }
      }
    `, { userToken, amount });

    return result.topupWalletUser;
  }

  /**
   * Deduct amount from a user's wallet (merchant-initiated).
   * Used for order payments where the merchant charges the customer directly.
   */
  async deductFromUser(userToken: string, amount: number, description?: string): Promise<{ isSuccess: boolean }> {
    const result = await this.execute(`
      mutation deductFromUser($userToken: String!, $amount: Float!, $desc: String) {
        deductFromUser(userToken: $userToken, amount: $amount, description: $desc) {
          isSuccess
        }
      }
    `, { userToken, amount, desc: description });

    return result.deductFromUser;
  }

  /**
   * Send a payment request to a user. The user receives a notification
   * and the amount is auto-deducted when they accept.
   * Useful for "pay later" or invoice-style payments.
   */
  async sendPaymentRequest(userToken: string, amount: number): Promise<{ isSuccess: boolean }> {
    const result = await this.execute(`
      mutation sendPaymentRequest($userToken: String!, $amount: Float!) {
        sendPaymentRequest(userToken: $userToken, amount: $amount) {
          isSuccess
        }
      }
    `, { userToken, amount });

    return result.sendPaymentRequest;
  }

  /**
   * Transfer amount FROM merchant's wallet TO a user's wallet.
   * Used for refunds, cashback, or promotional credits.
   */
  async payToUser(userToken: string, amount: number, description?: string): Promise<{ isSuccess: boolean }> {
    const result = await this.execute(`
      mutation payToUser($userToken: String!, $amount: Float!, $desc: String) {
        payToUser(userToken: $userToken, amount: $amount, description: $desc) {
          isSuccess
        }
      }
    `, { userToken, amount, desc: description });

    return result.payToUser;
  }

  // ===================================================================
  // QUERIES
  // ===================================================================

  /**
   * Get a user's wallet details including total balance
   * and transaction history (balance array).
   */
  async userWallet(userToken: string): Promise<{
    total: number;
    balance: Array<{ uid: string; amount: number; type: string; createdAt: string }>;
  }> {
    const result = await this.execute(`
      query userWallet($userToken: String!) {
        userWallet(userToken: $userToken) {
          total
          balance {
            uid
            amount
            type
            createdAt
          }
        }
      }
    `, { userToken });

    return result.userWallet;
  }

  /**
   * Get all payment requests sent to a user.
   */
  async userPaymentRequests(userToken: string): Promise<Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }>> {
    const result = await this.execute(`
      query userPaymentRequests($userToken: String!) {
        userPaymentRequests(userToken: $userToken) {
          id
          amount
          status
          createdAt
        }
      }
    `, { userToken });

    return result.userPaymentRequests;
  }

  // ===================================================================
  // MEDICAL CARDS (optional — HealthPay-specific feature)
  // ===================================================================

  /**
   * Create a medical card for a user or their relatives.
   */
  async createMedCard(input: {
    mobile: string;
    fullName: string;
    nationalId: string;
    birthDate: string;
    gender: string;
    relationId: number;
  }): Promise<{ uid: string; nameOnCard: string }> {
    const result = await this.execute(`
      mutation createMedCard($mobile: String!, $fullName: String!, $nationalId: String!, $birthDate: String!, $gender: String!, $relationId: Float!) {
        createMedCard(mobile: $mobile, fullName: $fullName, nationalId: $nationalId, birthDate: $birthDate, gender: $gender, relationId: $relationId) {
          uid
          nameOnCard
        }
      }
    `, input);

    return result.createMedCard;
  }

  /**
   * Get all active medical cards for the merchant.
   */
  async getActiveMedCards(): Promise<Array<{
    nameOnCard: string;
    uid: string;
    isActive: boolean;
    birthDate: string;
    user: { uid: string; mobile: string };
  }>> {
    const result = await this.execute(`
      query {
        getActiveMedCards {
          nameOnCard
          uid
          isActive
          birthDate
          user {
            uid
            mobile
          }
        }
      }
    `);

    return result.getActiveMedCards;
  }

  // ===================================================================
  // CORE GRAPHQL EXECUTOR
  // ===================================================================

  /**
   * Execute a GraphQL query/mutation WITH merchant auth token.
   */
  private async execute(query: string, variables?: Record<string, any>): Promise<any> {
    await this.ensureMerchantAuth();

    try {
      const res = await this.client.post('', { query, variables }, {
        headers: {
          Authorization: `Bearer ${this.merchantToken}`,
        },
      });

      if (res.data.errors?.length) {
        const errors = res.data.errors;
        const errMsg = errors.map((e: any) => `${e.message} (code: ${e.extensions?.code || 'unknown'})`).join('; ');
        this.logger.error(`HealthPay GraphQL error: ${errMsg}`);

        // Check for auth-related error codes
        const authErrorCodes = ['2004', '3001', '3002'];
        const hasAuthError = errors.some((e: any) =>
          authErrorCodes.includes(String(e.extensions?.code)) ||
          e.message?.includes('authorization is invalid'),
        );

        if (hasAuthError) {
          this.merchantToken = null;
          await this.authMerchant();
          return this.execute(query, variables);
        }

        throw new Error(errMsg);
      }

      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 401) {
        this.merchantToken = null;
        await this.authMerchant();
        return this.execute(query, variables);
      }
      this.logger.error(`HealthPay API error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Execute a GraphQL query/mutation WITHOUT auth token (used for authMerchant itself).
   */
  private async executeRaw(query: string, variables?: Record<string, any>): Promise<any> {
    const res = await this.client.post('', { query, variables });

    if (res.data.errors?.length) {
      const errMsg = res.data.errors.map((e: any) => e.message).join('; ');
      this.logger.error(`HealthPay auth error: ${errMsg}`);
      throw new Error(errMsg);
    }

    return res.data.data;
  }

  private async ensureMerchantAuth() {
    if (!this.merchantToken || Date.now() >= this.tokenExpiresAt) {
      await this.authMerchant();
    }
  }
}
