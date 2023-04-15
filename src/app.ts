import Binance from './exchange/binance/api/spot';

const apiKey = process.env.BINANCE_API_KEY;
const secretKey = process.env.BINANCE_SECRET_KEY;

if (!apiKey || !secretKey) {
  throw new Error('Binance API key and secret key are required');
}

const binance = new Binance(apiKey, secretKey);
binance.wallet.getUserAsset().then(console.log);


