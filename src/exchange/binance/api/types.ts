type Side = 'BUY' | 'SELL';
type TimeInForce = 'GTC' | 'IOC' | 'FOK';
type NewOrderResponseType = 'ACK' | 'RESULT' | 'FULL';
type SelfTradePreventionMode = 'EXPIRE_TAKER' | 'EXPIRE_MAKER' | 'EXPIRE_BOTH' | 'NONE';

export interface OrderParams {
  symbol: string;
  side: Side;
  type: string;
  timeInForce?: TimeInForce;
  quantity?: number;
  quoteOrderQty?: number;
  price?: number;
  newClientOrderId?: string;
  strategyId?: number;
  strategyType?: string;
  stopPrice?: number;
  trailingDelta?: number;
  icebergQty?: number;
  newOrderRespType: NewOrderResponseType;
  selfTradePreventionMode?: SelfTradePreventionMode;
}

type CancelOrderRestrictions = 'ONLY_NEW' | 'ONLY_PARTIALLY_FILLED';

export interface CancelOrderParams {
  symbol: string;
  orderId?: number;
  origClientOrderId?: string;
  newClientOrderId?: string;
  cancelRestrictions?: CancelOrderRestrictions;
}

type CancelReplaceMode = 'STOP_ON_FAILURE' | 'ALLOW_FAILURE';

export interface ReplaceOrderParams extends OrderParams {
  cancelReplaceMode: CancelReplaceMode;
  cancelNewClientOrderId?: string;
  cancelOrigClientOrderId?: string;
  cancelOrderId?: number;
  origClientOrderId: string;
};

export interface AllOrdersParams {
  symbol: string;
  orderId?: number;
  startTime?: number;
  endTime?: number;
  limit: number;
}
