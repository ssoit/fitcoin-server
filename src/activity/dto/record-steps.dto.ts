import { IsInt, Min } from 'class-validator';

export class RecordStepsDto {
  @IsInt()
  @Min(1)
  steps: number;
}
