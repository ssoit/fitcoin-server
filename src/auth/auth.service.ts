import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import axios from 'axios';
import { AuthResponseDto } from './dto/auth-response.dto';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

interface KakaoUserInfo {
  id: number;
  kakao_account: {
    profile: {
      nickname: string;
      profile_image_url?: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async kakaoLogin(authorizationCode: string): Promise<AuthResponseDto> {
    try {
      // 1. Exchange authorization code for Kakao access token
      const kakaoToken = await this.getKakaoToken(authorizationCode);

      // 2. Get Kakao user profile
      const kakaoUser = await this.getKakaoUserInfo(kakaoToken.access_token);

      // 3. Find or create user
      let user = await this.prisma.user.findUnique({
        where: { kakaoId: String(kakaoUser.id) },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            kakaoId: String(kakaoUser.id),
            nickname: kakaoUser.kakao_account.profile.nickname,
            profileImage:
              kakaoUser.kakao_account.profile.profile_image_url || null,
          },
        });
      }

      // 4. Generate JWT tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.id, user.kakaoId);

      // 5. Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          kakaoId: user.kakaoId,
          nickname: user.nickname,
          profileImage: user.profileImage,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Kakao login failed');
    }
  }

  private async getKakaoToken(code: string): Promise<KakaoTokenResponse> {
    try {
      const response = await axios.post<KakaoTokenResponse>(
        'https://kauth.kakao.com/oauth/token',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            client_id: this.configService.get<string>('KAKAO_CLIENT_ID'),
            client_secret: this.configService.get<string>('KAKAO_CLIENT_SECRET'),
            redirect_uri: this.configService.get<string>('KAKAO_REDIRECT_URI'),
            code,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to get Kakao token');
    }
  }

  private async getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await axios.get<KakaoUserInfo>(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to get Kakao user info');
    }
  }

  private async generateTokens(userId: string, kakaoId: string) {
    const payload = { sub: userId, kakaoId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-secret',
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const expiresAt = new Date();
    const expirationString = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expirationDays = parseInt(expirationString.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-secret',
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const accessToken = await this.jwtService.signAsync(
        { sub: payload.sub, kakaoId: payload.kakaoId },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
          expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as any,
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
