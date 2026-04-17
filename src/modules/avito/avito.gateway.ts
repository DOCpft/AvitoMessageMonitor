import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AvitoMessage } from '../common/interfaces/message.interface';

@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'avito',
})
export class AvitoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(AvitoGateway.name);
  private readonly clients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.clients.set(client.id, client);
    this.logger.log(`Client connected: ${client.id}, total: ${this.clients.size}`);
    // Можно добавить аутентификацию через токен
    const token = client.handshake.auth.token;
    if (token !== process.env.WS_AUTH_TOKEN && process.env.WS_AUTH_TOKEN) {
      this.logger.warn(`Client ${client.id} attempted connection with invalid token`);
      client.disconnect();
      return;
    }
    client.emit('connected', { message: 'Connected to Avito message monitor' });
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}, total: ${this.clients.size}`);
  }

  sendNewMessage(message: AvitoMessage) {
    this.server.emit('newMessage', message);
    this.logger.debug(`Broadcasted new message from ${message.sender}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    this.logger.debug(`Ping from ${client.id}`);
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}