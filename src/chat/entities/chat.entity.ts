import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: number;

  @Column()
  receiverId: number;

  @Column()
  encryptedMessage: string;

  @Column()
  nonce: string;

  @Column({ nullable: true })
  senderPublicKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isEdited?: boolean;

  @Column({ default: false })
  isRead: boolean;

  // @UpdateDateColumn({ nullable: true })
  // editedAt?: Date;

  @ManyToOne(() => User)
  sender: User;

  @ManyToOne(() => User)
  receiver: User;
}
