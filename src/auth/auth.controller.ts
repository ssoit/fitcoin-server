import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('kakao')
  async kakaoLogin(@Body() kakaoLoginDto: KakaoLoginDto): Promise<AuthResponseDto> {
    return this.authService.kakaoLogin(kakaoLoginDto.authorizationCode);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string): Promise<AuthResponseDto> {
    return this.authService.kakaoLogin(code);
  }
}
