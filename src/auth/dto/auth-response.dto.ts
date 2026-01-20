export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    kakaoId: string;
    nickname: string;
    profileImage: string | null;
  };
}
