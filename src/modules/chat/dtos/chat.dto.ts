import { MessageType } from '@/schemas/chat-message.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the barber to start the conversation with',
    example: '65b7cdbf1d0e4c001f98d20a',
  })
  @IsString()
  @IsNotEmpty()
  barberId: string;

  @ApiPropertyOptional({
    description: 'Optional booking ID related to the conversation',
    example: '65b7cdbf1d0e4c001f98d21b',
  })
  @IsString()
  @IsOptional()
  bookingId?: string;
}


class AttachmentDto {
  @ApiProperty({
    description: 'File URL of the attachment',
    example: 'https://example.com/uploads/photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional({ example: 'photo.jpg' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ example: 512000 })
  @IsOptional()
  size?: number;

  @ApiPropertyOptional({
    description: 'Thumbnail URL for images or videos',
    example: 'https://example.com/uploads/thumbnails/photo_thumb.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message text content',
    example: 'Check out this image!',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Type of the message',
    enum: MessageType,
    example: MessageType.IMAGE,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'List of attachments for this message',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];


    @ApiPropertyOptional({
    description: "Message ID this message is replying to",
    example: "65a7c1a1b0f8a9c8e3d12345",
  })
  @IsOptional()
  @IsMongoId()
  replyToMessageId?: string;
}