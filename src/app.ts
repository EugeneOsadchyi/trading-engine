import Binance from './exchange/binance/api/spot';
import Stablecoin from './bots/stablecoin';

const apiKey = process.env.BINANCE_API_KEY;
const secretKey = process.env.BINANCE_SECRET_KEY;

if (!apiKey || !secretKey) {
  throw new Error('Binance API key and secret key are required');
}

const binance = new Binance(apiKey, secretKey);
// binance.wallet.getUserAsset().then(console.log);
// binance.market.getExchangeInfo().then(res => res.symbols.find(s => s.symbol === "BUSDUSDT")).then((res) => res && console.log(res.filters));


const stablecoin = new Stablecoin('BUSD', 'USDT', 1, binance);
stablecoin.start();
