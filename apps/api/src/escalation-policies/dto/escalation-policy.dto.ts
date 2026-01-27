import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateEscalationPolicyDto {
  @ApiProperty({ example: 'Primary Escalation Policy' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Escalation layers for critical alerts', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      rules: [
        {
          delayMinutes: 0,
          targets: [{ type: 'schedule', id: 'schedule_123' }],
        },
      ],
    },
  })
  @IsObject()
  rules!: Record<string, unknown>;
}

export class UpdateEscalationPolicyDto {
  @ApiProperty({ example: 'Primary Escalation Policy', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Escalation layers for critical alerts', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    required: false,
    example: {
      rules: [
        {
          delayMinutes: 5,
          targets: [{ type: 'schedule', id: 'schedule_123' }],
        },
      ],
    },
  })
  @IsObject()
  @IsOptional()
  rules?: Record<string, unknown>;
}
