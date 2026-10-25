import {
  Controller,
  Get,
  UseGuards,
  Session,
  Post,
  Query,
  Body,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import multer from 'multer';

import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { Images } from './utils/images';
import { Product } from '../products/models/product.model';
import { AddProductImageDto } from './dto/add-image.dto';
import { ImageDto } from './dto/image.dto';
import { ShopSession } from '../shared/types/session';

/**
 * Product photo uploads (admin only: the guards run before multer). Kept in memory and streamed to
 * Cloudinary, so they are bounded like the editor's own checks (image-gallery.component.ts): one file,
 * at most 10 MB, JPEG/PNG/WebP/GIF. Oversized files answer 413, other types 415.
 */
export const IMAGE_UPLOAD_LIMITS = { fileSize: 10 * 1024 * 1024, files: 1, fields: 10, parts: 12 };
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const uploadOptions: MulterOptions = {
  storage: multer.memoryStorage(),
  limits: IMAGE_UPLOAD_LIMITS,
  // Synchronous: decided from the declared type before any bytes are buffered
  fileFilter: (_req, file, done) =>
    IMAGE_TYPES.has(file.mimetype) ? done(null, true) : done(new UnsupportedMediaTypeException('Upload a JPEG, PNG, WebP or GIF image.'), false),
};

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('/images')
  getImages(@Session() session: ShopSession): Promise<Pick<Images, 'all'>> {
    return this.adminService.getImages(session.images);
  }

  @Post('/images/add')
  async addImage(
    @Session() session: ShopSession,
    @Body() imageDto: ImageDto,
    @Query(ValidationPipe) addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const result = await this.adminService.addImage(session.images, imageDto, addImageDto);
    if (!(result as Product).titleUrl) {
      session.images = result as Images;
    }

    return result;
  }

  @Post('/images/upload')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  async uploadImage(
    @Session() session: ShopSession,
    @UploadedFile() file: Express.Multer.File,
    @Query(ValidationPipe) addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const result = await this.adminService.uploadImage(session.images, file, addImageDto);
    if (!(result as Product).titleUrl) {
      session.images = result as Images;
    }

    return result;
  }

  @Post('/images/remove')
  async removeImage(
    @Session() session: ShopSession,
    @Body() imageDto: ImageDto,
    @Query(ValidationPipe) addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const result = await this.adminService.removeImage(session.images, imageDto, addImageDto);
    if (!(result as Product).titleUrl) {
      session.images = result as Images;
    }

    return result;
  }
}
