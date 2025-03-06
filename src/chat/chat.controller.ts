import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
  ParseIntPipe,
  Request,
  Put,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { VerifiedEmailGuard } from 'src/auth/guards/verified-email.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard, VerifiedEmailGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversation/:otherUserId')
  async getConversation(
    @Request() req,
    @Param('otherUserId', ParseIntPipe) otherUserId: number,
  ) {
    return this.chatService.findConversation(req.user.id, otherUserId);
  }

  @Get('recent')
  async getRecentChats(@Request() req) {
    try {
      return await this.chatService.findRecentChats(req.user.id);
    } catch (error) {
      console.error('Error getting recent chats:', error);
      throw error;
    }
  }

  @Get('search')
  async searchMessages(
    @Request() req,
    @Query('query') query: string,
    @Query('otherUserId', ParseIntPipe) otherUserId?: number,
  ) {
    return this.chatService.searchMessages(req.user.id, query, otherUserId);
  }

  @Get('recent-users')
  async getRecentChatUsers(@Request() req) {
    return this.chatService.getRecentChatUsers(req.user.id);
  }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Request() req) {
    await this.chatService.delete(id, req.user.id);
  }

  @Put('mark-read/:recipientId')
  async markMessagesAsRead(
    @Param('recipientId') recipientId: string,
    @Request() req,
  ) {
    return this.chatService.markMessagesAsRead(
      req.user.id,
      parseInt(recipientId),
    );
  }
}
