import { createHmac } from 'crypto';
import Base, { Options } from '../../lib/api/base';
import { buildQueryString } from '../../helpers/utils';

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

  public getAssetDetail() {
    return this.signedRequest('GET', '/sapi/v1/asset/assetDetail');
  }

  public getUserAsset(asset?: string) {
    return this.signedRequest('POST', '/sapi/v3/asset/getUserAsset', { asset });
  }
}
