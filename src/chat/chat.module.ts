import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { EncryptionService } from 'src/encryption/encryption.service';
import { Chat } from './entities/chat.entity';
import { ChatController } from './chat.controller';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, User]), UsersModule],
  providers: [ChatGateway, ChatService, EncryptionService],
  controllers: [ChatController],
})
export class ChatModule {}
