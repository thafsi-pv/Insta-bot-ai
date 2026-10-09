import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService, CreateProductDto, UpdateProductDto } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return this.productsService.findAll({ search, active: isActive });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post('upload-media')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productsService.uploadMedia(files);
  }

  @Post()
  async create(@Body() createProductDto: Record<string, any>) {
    return this.productsService.create(createProductDto as CreateProductDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: Record<string, any>,
  ) {
    return this.productsService.update(id, updateProductDto as UpdateProductDto);
  }

  @Post('generate-caption')
  async generateCaption(
    @Body() body: { name: string; price: number; description?: string },
  ) {
    return this.productsService.generateCaptionAndHashtags(body);
  }

  @Post(':id/link-instagram-media')
  async linkInstagramMedia(
    @Param('id') id: string,
    @Body()
    body: {
      instagramMediaId: string;
      mediaUrl?: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    },
  ) {
    return this.productsService.linkInstagramMedia(id, body);
  }

  @Post(':id/unlink-instagram-media')
  async unlinkInstagramMedia(
    @Param('id') id: string,
    @Body() body: { instagramMediaId: string },
  ) {
    return this.productsService.unlinkInstagramMedia(id, body.instagramMediaId);
  }

  @Post(':id/publish-instagram')
  async publishToInstagram(
    @Param('id') id: string,
    @Body()
    body: {
      caption: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REELS';
      mediaUrls?: string[];
      imageUrl?: string;
    },
  ) {
    return this.productsService.publishToInstagram(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
