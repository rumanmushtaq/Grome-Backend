import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { SignatureDto } from './dto/signature.dto';
import { UploadDto } from './dto/upload.dto';
import { S3StorageService } from './s3Storage.service';
import { UserRole } from '@/schemas/user.schema';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('storage')
@Controller('storage')
export class S3StorageController {
  constructor(private readonly s3Storage: S3StorageService) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  // @UseGuards(RolesGuard)
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPayload: UploadDto,
    @Req() { user },
  ) {
    return this.s3Storage.uploadPublicFile(uploadPayload.type, user, file);
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('admin/upload')
  @UseInterceptors(FileInterceptor('file'))
  async adminUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPayload: UploadDto,
    @Req() { user },
  ) {
    console.log(uploadPayload.type, user, file);
    return this.s3Storage.uploadPublicFile(uploadPayload.type, user, file);
  }
}
