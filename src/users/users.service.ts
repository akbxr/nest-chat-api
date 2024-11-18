import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto) {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.userRepository.find({
        select: {
          id: true,
          username: true,
          email: true,
          picture: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error) {
      console.error('Failde to fetch users');
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findById(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    return user;
  }

  async findByVerificationToken(token: string): Promise<User> {
    return this.userRepository.findOne({ where: { verificationToken: token } });
  }

  async findByResetToken(token: string): Promise<User> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findById(id);

      if (updateUserDto.password) {
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
        updateUserDto.password = hashedPassword;
      }

      await this.userRepository.update(id, updateUserDto);

      const updateUser = await this.findById(id);
      const { password, ...result } = updateUser;
      return result as User;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to udpate user');
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const user = await this.findById(id);

      await this.userRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to delete user');
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.username',
          // 'user.email',
        ])
        .where('user.username ILIKE :query OR user.email ILIKE :query', {
          query: `%${query}%`,
        })
        .getMany();
    } catch (error) {
      throw new Error('Failed to search users');
    }
  }
}
