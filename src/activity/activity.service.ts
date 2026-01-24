import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivityType } from '@prisma/client';
import { ActivityResponseDto } from './dto/activity-response.dto';
import { TodayActivityDto } from './dto/today-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async recordSteps(userId: string, steps: number): Promise<ActivityResponseDto> {
    // Check daily limit
    const todayRewards = await this.getTodayRewards(userId, ActivityType.STEPS);
    const maxDailyRewards = this.configService.get<number>('MAX_DAILY_STEP_REWARDS', 100);

    if (todayRewards >= maxDailyRewards) {
      throw new BadRequestException(
        `Daily step reward limit reached. Maximum ${maxDailyRewards} FitCoins per day from steps.`,
      );
    }

    // Calculate coins earned
    const rewardPer1000Steps = this.configService.get<number>('REWARD_PER_1000_STEPS', 10);
    let coinsEarned = Math.floor((steps / 1000) * rewardPer1000Steps);

    // Cap to daily limit
    if (todayRewards + coinsEarned > maxDailyRewards) {
      coinsEarned = maxDailyRewards - todayRewards;
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Record activity
      const activity = await tx.activity.create({
        data: {
          userId,
          type: ActivityType.STEPS,
          value: steps,
        },
      });

      // Award coins
      if (coinsEarned > 0) {
        await tx.asset.create({
          data: {
            userId,
            amount: coinsEarned,
            reason: `Walked ${steps} steps`,
          },
        });
      }

      return activity;
    });

    return {
      id: result.id,
      type: result.type,
      value: result.value,
      coinsEarned,
      createdAt: result.createdAt,
      message: coinsEarned > 0
        ? `Great job! You earned ${coinsEarned} FitCoins!`
        : 'Activity recorded, but daily reward limit reached.',
    };
  }

  async recordWorkout(userId: string, minutes: number): Promise<ActivityResponseDto> {
    // Check daily limit
    const todayRewards = await this.getTodayRewards(userId, ActivityType.WORKOUT);
    const maxDailyRewards = this.configService.get<number>('MAX_DAILY_WORKOUT_REWARDS', 100);

    if (todayRewards >= maxDailyRewards) {
      throw new BadRequestException(
        `Daily workout reward limit reached. Maximum ${maxDailyRewards} FitCoins per day from workouts.`,
      );
    }

    // Calculate coins earned
    const rewardPerMinute = this.configService.get<number>('REWARD_PER_WORKOUT_MINUTE', 5);
    let coinsEarned = minutes * rewardPerMinute;

    // Cap to daily limit
    if (todayRewards + coinsEarned > maxDailyRewards) {
      coinsEarned = maxDailyRewards - todayRewards;
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Record activity
      const activity = await tx.activity.create({
        data: {
          userId,
          type: ActivityType.WORKOUT,
          value: minutes,
        },
      });

      // Award coins
      if (coinsEarned > 0) {
        await tx.asset.create({
          data: {
            userId,
            amount: coinsEarned,
            reason: `Worked out for ${minutes} minutes`,
          },
        });
      }

      return activity;
    });

    return {
      id: result.id,
      type: result.type,
      value: result.value,
      coinsEarned,
      createdAt: result.createdAt,
      message: coinsEarned > 0
        ? `Excellent workout! You earned ${coinsEarned} FitCoins!`
        : 'Activity recorded, but daily reward limit reached.',
    };
  }

  async getTodayActivity(userId: string): Promise<TodayActivityDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [stepsData, workoutData, stepsRewards, workoutRewards] = await Promise.all([
      this.prisma.activity.aggregate({
        where: {
          userId,
          type: ActivityType.STEPS,
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { value: true },
      }),
      this.prisma.activity.aggregate({
        where: {
          userId,
          type: ActivityType.WORKOUT,
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { value: true },
      }),
      this.getTodayRewards(userId, ActivityType.STEPS),
      this.getTodayRewards(userId, ActivityType.WORKOUT),
    ]);

    return {
      steps: {
        total: stepsData._sum.value || 0,
        rewardsEarned: stepsRewards,
        rewardsMax: this.configService.get<number>('MAX_DAILY_STEP_REWARDS', 100),
      },
      workout: {
        total: workoutData._sum.value || 0,
        rewardsEarned: workoutRewards,
        rewardsMax: this.configService.get<number>('MAX_DAILY_WORKOUT_REWARDS', 100),
      },
    };
  }

  private async getTodayRewards(userId: string, type: ActivityType): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const rewards = await this.prisma.asset.aggregate({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        reason: {
          contains: type === ActivityType.STEPS ? 'steps' : 'minutes',
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(rewards._sum.amount || 0);
  }
}
