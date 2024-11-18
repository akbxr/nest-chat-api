import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { VerifiedEmailGuard } from 'src/auth/guards/verified-email.guard';
import { UserGuard } from 'src/auth/guards/user.guard';

@UseGuards(JwtAuthGuard, VerifiedEmailGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  async searchUsers(@Query('user') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.usersService.findById(+id);
  }

  @Patch(':id')
  @UseGuards(UserGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(UserGuard)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
