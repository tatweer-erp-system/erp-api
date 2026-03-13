import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '@/common/types/request.types';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login without specifying tenant (auto-resolves tenant from email)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  loginByEmail(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.loginByEmail(dto, ip, userAgent);
  }

  @Public()
  @Post(':tenantSlug/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login to tenant account' })
  @ApiParam({ name: 'tenantSlug', description: 'Tenant slug identifier' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 423, description: 'Account locked' })
  login(@Param('tenantSlug') tenantSlug: string, @Body() dto: LoginDto, @Req() req: Request) {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'] || '';
    // tenantId will be resolved inside the service from the slug
    return this.authService.loginBySlug(tenantSlug, dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token (rotates refresh token)' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const payload = this.jwtService.verify(dto.refreshToken, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
    });

    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.authService.refreshTokens(
      payload.sub,
      payload.tenantSlug,
      payload.tenantId,
      dto.refreshToken,
      ip,
      userAgent,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.tenantId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for current user' })
  @ApiResponse({ status: 200, description: 'Active sessions list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getSessions(user.tenantId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'id', description: 'Session/refresh token ID' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string) {
    return this.authService.revokeSession(user.tenantId, user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions (logout everywhere)' })
  @ApiResponse({ status: 200, description: 'All sessions revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  revokeAllSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.revokeAllSessions(user.tenantId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('pin/status')
  @ApiOperation({ summary: 'Check if the current user has a PIN set' })
  @ApiResponse({ status: 200, description: 'PIN status' })
  getPinStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getPinStatus(user.tenantId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('pin/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update the current user PIN' })
  @ApiResponse({ status: 200, description: 'PIN set successfully' })
  setPin(@CurrentUser() user: AuthenticatedUser, @Body() body: { pin: string }) {
    return this.authService.setPin(user.tenantId, user.id, body.pin);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('pin/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the current user PIN' })
  @ApiResponse({ status: 200, description: 'PIN verified successfully' })
  @ApiResponse({ status: 400, description: 'Incorrect PIN or PIN not set' })
  verifyPin(@CurrentUser() user: AuthenticatedUser, @Body() body: { pin: string }) {
    return this.authService.verifyPin(user.tenantId, user.id, body.pin);
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
  }
}
