import { Controller, Get, UseGuards, Session, Post, Query, Body, ValidationPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';

import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { Images } from './utils/images';
import { Product } from '../products/models/product.model';
import { AddProductImageDto } from './dto/add-image.dto';
import { ImageDto } from './dto/image.dto';
import { ShopSession } from '../shared/types/session';

const storage = multer.memoryStorage();

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
  @UseInterceptors(FileInterceptor('file', { storage }))
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
