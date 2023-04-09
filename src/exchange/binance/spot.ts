import { createHmac } from 'crypto';
import Base, { Options } from '../../lib/api/base';
import { buildQueryString } from '../../helpers/utils';
import { AllOrdersParams, CancelOrderParams, OrderParams, ReplaceOrderParams } from './types';

const PRODUCTION_URL = 'https://api.binance.com';
const TESTNET_URL = 'https://testnet.binance.vision';

export default class Spot extends Base {
  private apiKey: string;
  private secretKey: string;
  public isTestnet: boolean;

  constructor(apiKey: string, secretKey: string, isTestnet = false) {
    super();

    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.isTestnet = isTestnet;
  }

  public getBaseURL() {
    return this.isTestnet ? TESTNET_URL : PRODUCTION_URL;
  }

  public publicRequest(method: string, path: string, params: any = {}) {
    return this.request(method, path, { query: buildQueryString(params) });
  }

  public signedRequest(method: string, path: string, params: any = {}) {
    const timestamp = Date.now();

    const queryString = buildQueryString({ ...params, timestamp })
    console.log(queryString);

    const signature = createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');

    return this.request(method, path, {
      headers: {
        'X-MBX-APIKEY': this.apiKey,
      },
      query: `${queryString}&signature=${signature}`,
    });
  }

  public getExchangeInfo() {
    return this.request('GET', '/api/v3/exchangeInfo');
  }

  public getAccountStatus() {
    return this.signedRequest('GET', '/sapi/v1/account/status');
  }

  public getAccountInfo() {
    return this.signedRequest('GET', '/api/v3/account');
  }

  public getAssetDetail() {
    return this.signedRequest('GET', '/sapi/v1/asset/assetDetail');
  }

  public getUserAsset(params: { asset?: string } = {}) {
    return this.signedRequest('POST', '/sapi/v3/asset/getUserAsset', params);
  }

  public newTestOrder(order: OrderParams) {
    return this.signedRequest('POST', '/api/v3/order/test', order);
  }

  public newOrder(order: OrderParams) {
    return this.signedRequest('POST', '/api/v3/order', order);
  }

  public cancelOrder(params: CancelOrderParams) {
    return this.signedRequest('DELETE', '/api/v3/order', params);
  }

  public cancelAllOpenOrders(params: { symbol: string }) {
    return this.signedRequest('DELETE', '/api/v3/openOrders', params);
  }

  public getOrder(params: { symbol: string; orderId?: number; origClientOrderId?: string }) {
    return this.signedRequest('GET', '/api/v3/order', params);
  }

  public replaceOrder(params: ReplaceOrderParams) {
    return this.signedRequest('POST', '/api/v3/order/cancelReplace', params);
  }

  public getOpenOrders(params: { symbol?: string } = {}) {
    return this.signedRequest('GET', '/api/v3/openOrders', params);
  }

  public getAllOrders(params: AllOrdersParams) {
    return this.signedRequest('GET', '/api/v3/allOrders', params);
  }
}
