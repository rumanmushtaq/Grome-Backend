import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FILE_TYPE } from '../types/storageTypes';

export class UploadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  type: FILE_TYPE;
}
