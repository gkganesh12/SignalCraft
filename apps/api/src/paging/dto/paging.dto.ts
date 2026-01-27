import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const CHANNELS = ['SLACK', 'EMAIL', 'SMS', 'VOICE'] as const;

export class PagingStepDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  channels!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  delaySeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  repeatCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  repeatIntervalSeconds?: number;

  static isValidChannel(channel: string) {
    return CHANNELS.includes(channel as (typeof CHANNELS)[number]);
  }
}

export class CreatePagingPolicyDto {
  @IsString()
  name!: string;

  @IsString()
  rotationId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  steps!: PagingStepDto[];
}

export class UpdatePagingPolicyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rotationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  steps?: PagingStepDto[];
}

export class TriggerPagingDto {
  @IsString()
  policyId!: string;

  @IsString()
  alertGroupId!: string;
}
