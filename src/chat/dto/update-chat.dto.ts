import { PartialType } from '@nestjs/mapped-types';
import { CreateChatDto } from './create-chat.dto';

export class UpdateChatDto {
  id: string;
  senderId: number;
  encryptedMessage: string;
  nonce: string;
}
