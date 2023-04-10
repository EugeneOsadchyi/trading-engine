import Base from "../base";

export default class Market extends Base {
  public getExchangeInfo() {
    return this.request('GET', '/api/v3/exchangeInfo');
  }
}
