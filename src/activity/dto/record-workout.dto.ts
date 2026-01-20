import { IsInt, Min } from 'class-validator';

export class RecordWorkoutDto {
  @IsInt()
  @Min(1)
  minutes: number;
}
