import { Injectable, NotFoundException, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';
import { Chat } from './entities/chat.entity';
import { User } from 'src/users/entities/user.entity';
import { EncryptionService } from 'src/encryption/encryption.service';
import { UpdateChatDto } from './dto/update-chat.dto';

@Injectable()
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private encryptionService: EncryptionService,
  ) {}

  async create(createChatDto: CreateChatDto) {
    const chat = this.chatRepository.create({
      ...createChatDto,
      createdAt: new Date(),
    });

    return this.chatRepository.save(chat);
  }

  async update(updateChatDto: UpdateChatDto): Promise<Chat> {
    const message = await this.chatRepository.findOne({
      where: {
        id: updateChatDto.id,
        senderId: updateChatDto.senderId,
      },
    });

    Object.assign(message, {
      encryptedMessage: updateChatDto.encryptedMessage,
      nonce: updateChatDto.nonce,
      isEdited: true,
      // editedAt: new Date(),
    });

    const updatedMessage = await this.chatRepository.save(message);

    return updatedMessage;
  }

  async delete(id: string, senderId: number): Promise<void> {
    await this.chatRepository.delete({ id, senderId });
  }

  async findConversation(userId: number, otherUserId: number): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
      select: [
        'id',
        'senderId',
        'receiverId',
        'encryptedMessage',
        'nonce',
        'senderPublicKey',
        'createdAt',
        'isEdited',
      ],
      order: { createdAt: 'ASC' },
      relations: ['sender', 'receiver'],
    });
  }

  async findRecentChats(userId: number) {
    try {
      return await this.chatRepository
        .createQueryBuilder('chat')
        .where('chat.senderId = :userId OR chat.receiverId = :userId', {
          userId,
        })
        .leftJoinAndSelect('chat.sender', 'sender')
        .leftJoinAndSelect('chat.receiver', 'receiver')
        .orderBy('chat.createdAt', 'DESC')
        .getMany();
    } catch (error) {
      console.error('Error finding recent chats:', error);
      throw error;
    }
  }

  async searchMessages(userId: number, query: string, otherUserId?: number) {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.message ILIKE :query', { query: `%${query}%` })
      .andWhere('(chat.senderId = :userId OR chat.receiverId = :userId)', {
        userId,
      });

    if (otherUserId) {
      queryBuilder.andWhere(
        '(chat.senderId = :otherUserId OR chat.receiverId = :otherUserId)',
        { otherUserId },
      );
    }

    return queryBuilder
      .orderBy('chat.createdAt', 'DESC')
      .leftJoinAndSelect('chat.sender', 'sender')
      .leftJoinAndSelect('chat.receiver', 'receiver')
      .getMany();
  }

  async getRecentChatUsers(userId: number) {
    try {
      // Ambil semua chat yang melibatkan user
      const allChats = await this.chatRepository.find({
        where: [{ senderId: userId }, { receiverId: userId }],
        order: {
          createdAt: 'DESC',
        },
        relations: ['sender', 'receiver'],
      });

      // Dapatkan unique users dari chat
      const uniqueUsers = new Map();

      allChats.forEach((chat) => {
        const otherUserId =
          chat.senderId === userId ? chat.receiverId : chat.senderId;

        if (!uniqueUsers.has(otherUserId)) {
          uniqueUsers.set(otherUserId, {
            lastMessage: chat,
            lastMessageAt: chat.createdAt,
          });
        }
      });

      // Dapatkan detail user dan format response
      const userDetails = await Promise.all(
        Array.from(uniqueUsers.entries()).map(async ([otherUserId, data]) => {
          const user = await this.userRepository.findOne({
            where: { id: otherUserId },
            select: ['id', 'username', 'email', 'picture'],
          });

          return {
            user,
            lastMessage: {
              id: data.lastMessage.id,
              message: data.lastMessage.encryptedMessage,
              nonce: data.lastMessage.nonce,
              createdAt: data.lastMessage.createdAt,
              isRead: data.lastMessage.isRead || false,
              senderId: data.lastMessage.senderId,
            },
            lastMessageAt: data.lastMessageAt,
          };
        }),
      );

      // Sort by lastMessageAt descending
      return userDetails.sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      );
    } catch (error) {
      console.error('Error getting recent chat users:', error);
      throw new Error('Failed to get recent chat users');
    }
  }

  async markMessagesAsRead(userId: number, recipientId: number) {
    try {
      // Update semua pesan yang belum dibaca dari recipientId ke userId
      await this.chatRepository.update(
        {
          senderId: recipientId,
          receiverId: userId,
          isRead: false,
        },
        {
          isRead: true,
        },
      );
      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new Error('Failed to mark messages as read');
    }
  }
}
