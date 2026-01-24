export class ActivityProgressDto {
  total: number;
  rewardsEarned: number;
  rewardsMax: number;
}

export class TodayActivityDto {
  steps: ActivityProgressDto;
  workout: ActivityProgressDto;
}
