import { IsNumber, IsString } from 'class-validator';

export class CreateChatDto {
  id: string;

  @IsNumber()
  senderId: number;

  @IsNumber()
  receiverId: number;

  @IsString()
  encryptedMessage: string;

  @IsString()
  senderPublicKey: string;

  @IsString()
  nonce: string;
}
