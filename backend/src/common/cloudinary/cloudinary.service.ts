import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'IMAGE' | 'VIDEO';
  format?: string;
  duration?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log(`Cloudinary successfully configured for cloud: ${cloudName}`);
    } else {
      this.logger.warn(
        'Cloudinary credentials not yet provided in .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Placeholder URLs will be generated until keys are set.',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'insta_bot_products',
  ): Promise<UploadResult> {
    const isVideo = file.mimetype.startsWith('video/');
    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';

    if (!this.isConfigured) {
      // Graceful fallback mock if keys aren't added yet
      this.logger.warn(
        `Cloudinary keys missing. Simulating upload for file: ${file.originalname}`,
      );
      const mockUrl = isVideo
        ? 'https://res.cloudinary.com/demo/video/upload/dog.mp4'
        : `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80`;
      return {
        url: mockUrl,
        secureUrl: mockUrl,
        publicId: `mock_${Date.now()}`,
        resourceType: isVideo ? 'VIDEO' : 'IMAGE',
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`);
            return reject(
              new BadRequestException(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`),
            );
          }

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type === 'video' ? 'VIDEO' : 'IMAGE',
            format: result.format,
            duration: result.duration,
          });
        },
      );

      const readableStream = Readable.from(file.buffer);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder = 'insta_bot_products',
  ): Promise<UploadResult[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }
}
