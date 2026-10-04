import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CustomerSessionService } from './customer-session.service.js';
import { AuthGuard, CustomerGuard } from './guards.js';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, CustomerGuard, CustomerSessionService],
  exports: [AuthService, AuthGuard, CustomerGuard, CustomerSessionService, JwtModule],
})
export class AuthModule {}
