import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ nullable: true })
  provider: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  verificationToken: string;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshToken: RefreshToken[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
