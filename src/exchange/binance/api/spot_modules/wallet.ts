import Base from "../base";

export default class Wallet extends Base {
  public getAccountStatus() {
    return this.signedRequest('GET', '/sapi/v1/account/status');
  }

  public getAssetDetail() {
    return this.signedRequest('GET', '/sapi/v1/asset/assetDetail');
  }

  public getUserAsset(params: { asset?: string } = {}) {
    return this.signedRequest('POST', '/sapi/v3/asset/getUserAsset', params);
  }
}
