import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { S3 } from 'aws-sdk';

import { FILE_TYPE } from './types/storageTypes';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/schemas/user.schema';
import { ErrorStatus } from '../auth/enums/role.enum';

const path = require('path');
const filename = path.basename(__filename);

@Injectable()
export class S3StorageService {
  constructor(
    @Inject('S3') private readonly S3: S3,


  ) {}

  async uploadPublicFile(type: string, user: User, file: any) {
    try {
      if (!file) {
        throw new BadRequestException('File not attached');
      }

      let path = '';

      switch (type) {
        case FILE_TYPE.TERMS_CONDITIONS:
          path = `${FILE_TYPE.TERMS_CONDITIONS}/${uuidv4()}`;
          break;

        case FILE_TYPE.CHAT:
          path = `${FILE_TYPE.CHAT}//${uuidv4()}`;
          break;

        case FILE_TYPE.TASK:
          path = `${FILE_TYPE.TASK}/${uuidv4()}`;
          break;

        case FILE_TYPE.USER:
          path = `${FILE_TYPE.USER}/${uuidv4()}`;
          break;

        case FILE_TYPE.VENDOR:
          path = `${FILE_TYPE.VENDOR}/${uuidv4()}`;
          break;

        case FILE_TYPE.SERVICE:
          path = `${FILE_TYPE.SERVICE}/${uuidv4()}`;
          break;

        case FILE_TYPE.KYC:
          path = `${user._id}/${FILE_TYPE.KYC}/${uuidv4()}`;
          break;

        case FILE_TYPE.SUBSERVICE:
          path = `${user._id}/${FILE_TYPE.SUBSERVICE}/${uuidv4()}`;
          break;

        default:
          break;
      }

      const uploadResult = await this.S3.upload({
        Bucket: process.env.AWS_BUCKET,
        Body: file.buffer,
        Key: path,
        ContentType: file.mimetype,
      }).promise();

      return {
        url: process.env.AWS_ACCESS_URL + '/' + uploadResult.Key,
        key: uploadResult.Key,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async deleteImageFormS3(key: string) {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    };

    return await this.S3.deleteObject(params).promise();
  }
}
