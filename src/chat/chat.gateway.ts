import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';
import { EncryptionService } from 'src/encryption/encryption.service';
import { UpdateChatDto } from './dto/update-chat.dto';
import { randomUUID } from 'crypto';

interface UserKeys {
  publicKey: string;
  secretKey: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, string>(); // userId -> socketId
  private userKeys = new Map<number, { publicKey: string }>(); // userId -> {publicKey}

  constructor(
    private readonly chatService: ChatService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const publicKey = client.handshake.query.publicKey as string;

    if (userId && publicKey) {
      console.log('User connected:', {
        userId,
        publicKey: publicKey.substring(0, 10) + '...',
      });

      // Store socket connection and public key
      this.connectedUsers.set(Number(userId), client.id);
      this.userKeys.set(Number(userId), { publicKey });

      // Notify others that user is online
      client.broadcast.emit('userConnected', { userId });
    }
  }

  handleDisconnect(client: Socket) {
    let disconnectedUserId: number | null = null;

    this.connectedUsers.forEach((socketId, userId) => {
      if (socketId === client.id) {
        disconnectedUserId = userId;
        this.connectedUsers.delete(userId);
        this.userKeys.delete(userId);
      }
    });

    if (disconnectedUserId) {
      client.broadcast.emit('userDisconnected', { userId: disconnectedUserId });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      messageId: string;
      senderId: number;
      receiverId: number;
      encryptedMessage: string;
      nonce: string;
      senderPublicKey: string;
      recipientPublicKey: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (
        !data.nonce ||
        !data.encryptedMessage ||
        !data.senderId ||
        !data.receiverId ||
        !data.recipientPublicKey ||
        !data.senderPublicKey
      ) {
        console.log(data);
        throw new Error('Missing required message data');
      }
      console.log(data);
      console.log('Received message data:', JSON.stringify(data, null, 2));

      const senderKeys = this.userKeys.get(data.senderId);
      if (!senderKeys) {
        console.error('Sender keys not found for user:', data.senderId);
        console.log('Available keys:', Array.from(this.userKeys.keys()));
        throw new Error('Sender keys not found');
      }

      console.log('Sender keys:', senderKeys); // Debug log

      const senderPublicKey = this.userKeys.get(data.senderId);
      if (!senderPublicKey) {
        throw new Error('Sender public key not found');
      }

      // Save message
      const chat = await this.chatService.create({
        id: data.messageId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        encryptedMessage: data.encryptedMessage,
        senderPublicKey: senderKeys.publicKey,
        nonce: data.nonce,
      });

      // Send to receiver if online
      const receiverSocketId = this.connectedUsers.get(data.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', {
          ...chat,
          senderPublicKey: data.senderPublicKey, // Send sender's public key for decryption
        });
      }

      return chat;
    } catch (error) {
      console.error('Message handling error:', error);
      client.emit('error', {
        message: error.message,
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody()
    data: {
      messageId: string;
      senderId: number;
      encryptedMessage: string;
      nonce: string;
      senderPublicKey: string;
      recipientPublicKey: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!data.nonce || !data.encryptedMessage || !data.senderId) {
        console.log(data);
        throw new Error('Missing required message data');
      }

      console.log('Received edit request with data:', data);
      const updateDto: UpdateChatDto = {
        id: data.messageId,
        senderId: data.senderId,
        encryptedMessage: data.encryptedMessage,
        nonce: data.nonce,
      };

      const updatedMessage = await this.chatService.update(updateDto);

      const receiverSocketId = this.connectedUsers.get(
        updatedMessage.receiverId,
      );
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('messageEdited', {
          ...updatedMessage,
          senderPublicKey: data.senderPublicKey,
          recipientPublicKey: data.recipientPublicKey,
        });
      }

      client.emit('messageEdited', {
        ...updatedMessage,
        senderPublicKey: data.senderPublicKey,
        recipientPublicKey: data.recipientPublicKey,
      });

      return updatedMessage;
    } catch (error) {
      console.error('Message edit error:', error);
      throw new WsException(error.message);
    }
  }

  @SubscribeMessage('getConversation')
  async getConversation(
    @MessageBody() data: { userId: number; otherUserId: number },
  ) {
    return this.chatService.findConversation(data.userId, data.otherUserId);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { senderId: number; receiverId: number },
  ) {
    const receiverSocketId = this.connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      this.server
        .to(receiverSocketId)
        .emit('userTyping', { userId: data.senderId });
    }
  }
}
