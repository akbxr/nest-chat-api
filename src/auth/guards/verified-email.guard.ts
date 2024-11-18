import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before accessing this resource',
      );
    }

    return true;
  }
}
