class WebsocketManager {
  private sockets: {
    [symbol: string]: {
      [type: string]: WebSocket
    }
  };

  constructor() {
    this.sockets = {};
  }

  public getSocket(symbol: string, type: string): WebSocket {
    if (!this.sockets[symbol]) {
      this.sockets[symbol] = {};
    }

    // TODO: websocket manager should somehow differ different exchanges
    // and users
    if (!this.sockets[symbol][type]) {
      this.sockets[symbol][type] = new WebSocket(
        `${process.env.REACT_APP_WS_URL}/${symbol}@${type}`
      );
    }

    return this.sockets[symbol][type];
  }
}
