import BinanceSpot from '../exchange/binance/api/spot';
import { OpenOrder } from '../exchange/binance/api/types';
import BinanceWebsocketMarketStreams from '../exchange/binance/websocket/marketStreams';
import { AccountUpdateEvent, BalanceUpdateEvent, BookTickerUpdateEvent, OrderUpdateEvent } from '../exchange/binance/websocket/types';
import BinanceWebsocketUserDataStreams from '../exchange/binance/websocket/userDataStreams';

const MIN_BASE_ASSET_QUANTITY = 11;
const MIN_QUOTE_ASSET_QUANTITY = 10;

const PRICE_STEP = 0.0001;
const BUY = 'BUY';
const SELL = 'SELL';

export default class StablecoinBot {
  baseAsset: string;
  baseAssetQuantity: number = 0;
  baseAssetPrecision?: number;
  quoteAsset: string;
  quoteAssetQuantity: number = 0;
  quoteAssetPrecision?: number;

  spotClient: BinanceSpot;

  buyOrder?: OpenOrder;
  sellOrder?: OpenOrder;

  isQuoteOrderQtyMarketAllowed: boolean = false;

  marketStreams?: BinanceWebsocketMarketStreams;
  userDataStreams?: BinanceWebsocketUserDataStreams;

  buyPriceLimit: number;
  sellUsingLastBuyPrice: boolean = false;
  lastBuyPrice?: number;


  constructor(baseAsset: string, quoteAsset: string, buyPriceLimit: number, spotClient: BinanceSpot) {
    this.baseAsset = baseAsset;
    this.quoteAsset = quoteAsset;
    this.buyPriceLimit = buyPriceLimit;
    this.spotClient = spotClient;
  }

  async start() {
    console.log('Starting bot...');

    await this.initialize();

    const marketStreamName = this.getMarketStreamName();
    console.log('Subscribing to market stream', marketStreamName);

    this.marketStreams = new BinanceWebsocketMarketStreams();
    this.marketStreams.on('message', this.handleMarketStreamMessage);

    this.userDataStreams = new BinanceWebsocketUserDataStreams(this.spotClient);
    this.userDataStreams.on('message', this.handleUserDataStreamMessage);

    this.marketStreams.subscribe(marketStreamName);
    this.userDataStreams.subscribe();

    console.log('Bot started');
  }

  stop() {
    const marketStreamName = this.getMarketStreamName();

    this.marketStreams?.unsubscribe(marketStreamName);
    this.userDataStreams?.unsubscribe();
  }

  async initialize() {
    await this.initializeSymbolInfo();
    await this.initializeAssetQuantity();
    await this.initializeOpenOrders();
  }

  private async initializeSymbolInfo() {
    const symbolInfo = await this.getSymbolInfo();

    if (!symbolInfo) {
      throw new Error(`Symbol ${this.getSymbol()} not found`);
    }

    this.baseAssetPrecision = symbolInfo.baseAssetPrecision;
    this.quoteAssetPrecision = symbolInfo.quoteAssetPrecision;

    this.isQuoteOrderQtyMarketAllowed = symbolInfo.quoteOrderQtyMarketAllowed;
  }

  private async initializeAssetQuantity() {
    const balances = await this.spotClient.wallet.getUserAsset();

    balances.forEach(balance => {
      if (balance.asset === this.baseAsset) {
        this.baseAssetQuantity = Number(balance.free);
      } else if (balance.asset === this.quoteAsset) {
        this.quoteAssetQuantity = Number(balance.free);
      }
    });

    if (this.quoteAssetQuantity < MIN_QUOTE_ASSET_QUANTITY && this.baseAssetQuantity < MIN_BASE_ASSET_QUANTITY) {
      throw new Error(`Insufficient funds. ${this.baseAsset}=${this.baseAssetQuantity}, ${this.quoteAsset}=${this.quoteAssetQuantity}`);
    }
  }

  private async initializeOpenOrders() {
    const openOrders = await this.spotClient.trade.getOpenOrders({ symbol: this.getSymbol() });

    openOrders.forEach(order => {
      if (order.side === BUY) {
        this.buyOrder = order;
      } else if (order.side === SELL) {
        this.sellOrder = order;
      }
    });
  }

  private handleMarketStreamMessage = async (msg: BookTickerUpdateEvent) => {
    console.log('handleMarketStreamMessage', msg);

    if (msg.s !== this.getSymbol()) {
      console.log('Ignoring message for symbol', msg.s);
      return;
    }

    const { askPrice, askQuantity, bidPrice, bidQuantity } = this.normalizeBookTickerUpdateEvent(msg);

    if (this.quoteAssetQuantity > MIN_QUOTE_ASSET_QUANTITY) {
      const buyPrice = this.calculateBuyPrice({ askPrice, askQuantity, bidPrice, bidQuantity });

      if (this.buyOrder && +this.buyOrder.price === buyPrice) {
        return;
      }

      if (this.buyOrder) {
        console.log('Cancelling buy order', this.buyOrder);
        await this.cancelOrder(this.buyOrder);
      }

      console.log('buyPrice', buyPrice);

      this.buyOrder = await this.buy(buyPrice);
      console.log('buyOrder', this.buyOrder);
    }

    if (this.baseAssetQuantity > MIN_BASE_ASSET_QUANTITY) {
      const sellPrice = this.calculateSellPrice({ askPrice, askQuantity, bidPrice, bidQuantity });

      if (this.sellOrder && +this.sellOrder?.price === sellPrice) {
        return;
      }

      if (this.sellOrder) {
        console.log('Cancelling sell order', this.sellOrder);
        await this.cancelOrder(this.sellOrder);
      }

      console.log('sellPrice', sellPrice);

      this.sellOrder = await this.sell(sellPrice);
      console.log('sellOrder', this.sellOrder);
    }
  }

  private handleUserDataStreamMessage = (msg: AccountUpdateEvent | BalanceUpdateEvent | OrderUpdateEvent) => {
    switch (msg.e) {
      case 'executionReport':
        this.handleOrderUpdate(msg);
        break;
      case 'balanceUpdate':
        this.handleBalanceUpdate(msg);
        break;
      case 'outboundAccountPosition':
        this.handleAccountUpdate(msg);
        break;
      default:
        break;
    }
  }

  calculateBuyPrice(
    { askPrice, askQuantity, bidPrice, bidQuantity }:
    { askPrice: number, askQuantity: number, bidPrice: number, bidQuantity: number }
  ): number {
    let price;

    price = (askQuantity / bidQuantity >= 2) ? (bidPrice - PRICE_STEP) : bidPrice;
    price = (price < this.buyPriceLimit) ? price : this.buyPriceLimit;

    return price;
  }

  buy(price: number): Promise<OpenOrder> {
    return this.spotClient.trade.newOrder({
      symbol: this.getSymbol(),
      side: BUY,
      type: "LIMIT",
      quoteOrderQty: this.quoteAssetQuantity,
      price: this.round(price, 4),
      newOrderRespType: "FULL",
    });
  }

  calculateSellPrice(
    { askPrice, askQuantity, bidPrice, bidQuantity }:
    { askPrice: number, askQuantity: number, bidPrice: number, bidQuantity: number }
  ): number {
     let price;

     if (bidQuantity * 0.5 >= askQuantity) price = askPrice + PRICE_STEP;
     else price = askPrice;

     if (askQuantity / bidQuantity >= 1.25) price = bidPrice;

     if (this.lastBuyPrice) {
      if (price < this.lastBuyPrice) {
        price = this.lastBuyPrice;
      }

      if (!this.sellUsingLastBuyPrice && price < this.lastBuyPrice + PRICE_STEP) {
        price = this.lastBuyPrice + PRICE_STEP;
      }
     }

     return price;
  }

  sell(price: number) {
    return this.spotClient.trade.newOrder({
      symbol: this.getSymbol(),
      side: SELL,
      type: "LIMIT",
      quantity: this.baseAssetQuantity,
      price: this.round(price, 4),
      newOrderRespType: "FULL",
    });
  }

  private async cancelOrder(order?: OpenOrder) {
    if (!order) {
      return;
    }

    await this.spotClient.trade.cancelOrder({ symbol: this.getSymbol(), orderId: order.orderId });
  }

  private handleOrderUpdate(msg: OrderUpdateEvent) {
    if (msg.s !== this.getSymbol()) {
      return;
    }

    if (msg.X === 'CANCELED' || msg.X === 'FILLED' || msg.X === 'REJECTED' || msg.X === 'EXPIRED') {
      if (msg.S === BUY && msg.i === this.buyOrder?.orderId) {
        this.buyOrder = undefined;
      } else if (msg.S === SELL && msg.i === this.sellOrder?.orderId) {
        this.sellOrder = undefined;
      }
    }
  }

  private handleBalanceUpdate(msg: BalanceUpdateEvent) {
    console.log('<<< handleBalanceUpdate', msg);
    // not implemented
  }

  private handleAccountUpdate(msg: AccountUpdateEvent) {
    console.log('<<< handleAccountUpdate', msg);
    // not implemented
  }

  private normalizeBookTickerUpdateEvent(msg: BookTickerUpdateEvent) {
    const askPrice = Number(msg.a);
    const askQuantity = Number(msg.A);
    const bidPrice = Number(msg.b);
    const bidQuantity = Number(msg.B);

    return { askPrice, askQuantity, bidPrice, bidQuantity };
  }

  private getMarketStreamName() {
    return `${this.getSymbol().toLowerCase()}@bookTicker`;
  }

  private async getSymbolInfo() {
    const symbol = this.getSymbol();

    const exchangeInfo = await this.spotClient.market.getExchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);

    return symbolInfo;
  }

  private getSymbol() {
    return `${this.baseAsset}${this.quoteAsset}`;
  }

  private round(value: number, precision: number = 2): string {
    const multiplier = Math.pow(10, precision);

    return (Math.floor(value * multiplier) / multiplier).toPrecision(precision);
  }
}
