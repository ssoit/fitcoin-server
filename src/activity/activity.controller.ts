import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { RecordStepsDto } from './dto/record-steps.dto';
import { RecordWorkoutDto } from './dto/record-workout.dto';
import { ActivityResponseDto } from './dto/activity-response.dto';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('steps')
  async recordSteps(
    @CurrentUser() user: JwtPayload,
    @Body() recordStepsDto: RecordStepsDto,
  ): Promise<ActivityResponseDto> {
    return this.activityService.recordSteps(user.sub, recordStepsDto.steps);
  }

  @Post('workout')
  async recordWorkout(
    @CurrentUser() user: JwtPayload,
    @Body() recordWorkoutDto: RecordWorkoutDto,
  ): Promise<ActivityResponseDto> {
    return this.activityService.recordWorkout(user.sub, recordWorkoutDto.minutes);
  }
}
