import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class UserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = parseInt(request.params.id);

    if (user.sub !== userId) {
      throw new ForbiddenException('You can only modify your own data');
    }

    return true;
  }
}
