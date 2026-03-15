import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class WasslChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WasslChatGateway.name);
  private tenantRooms = new Map<string, Set<string>>(); // tenantId -> Set<socketId>

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token);
      const tenantId = payload.tenantId;
      client.data = { userId: payload.sub, tenantId, role: payload.role };
      client.join(`tenant:${tenantId}`);
      if (!this.tenantRooms.has(tenantId)) this.tenantRooms.set(tenantId, new Set());
      this.tenantRooms.get(tenantId)!.add(client.id);
      this.logger.log(`Client connected: ${client.id} (tenant: ${tenantId})`);
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    const tenantId = client.data?.tenantId;
    if (tenantId) this.tenantRooms.get(tenantId)?.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('agent_typing', { userId: client.data.userId, conversationId: data.conversationId });
  }

  // Emit helpers for other services to use
  emitNewMessage(tenantId: string, conversationId: string, message: any) {
    this.server.to(`tenant:${tenantId}`).emit('new_message', { conversationId, message });
    this.server.to(`conversation:${conversationId}`).emit('conversation_message', message);
  }

  emitConversationUpdate(tenantId: string, conversation: any) {
    this.server.to(`tenant:${tenantId}`).emit('conversation_updated', conversation);
  }

  emitNewOrder(tenantId: string, order: any) {
    this.server.to(`tenant:${tenantId}`).emit('new_order', order);
  }

  emitPaymentUpdate(tenantId: string, payment: any) {
    this.server.to(`tenant:${tenantId}`).emit('payment_updated', payment);
  }

  emitNotification(tenantId: string, notification: any) {
    this.server.to(`tenant:${tenantId}`).emit('notification', notification);
  }
}
