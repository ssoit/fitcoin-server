import { IsNotEmpty, IsString } from 'class-validator';

export class KakaoLoginDto {
  @IsNotEmpty()
  @IsString()
  authorizationCode: string;
}
