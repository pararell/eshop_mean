import {
    Controller,
    Get,
    UseGuards,
    Session,
    Post,
    Query,
    Body,
    ValidationPipe,
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { Images } from './images';
import { Product } from '../products/models/product.model';
import { GetImageDto } from './dto/get-image.dto';

  
  @Controller('api/admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  export class AdminController {
    constructor(private adminService: AdminService) {}

    @Get('/images')
    getImages(@Session() session): Promise<Images> {
       return this.adminService.getImages(session.images);
    }
    

    @Post('/images/add')
    async addImage(
        @Session() session, 
        @Body() image: {image: string},
        @Query(ValidationPipe) getImageDto: GetImageDto): Promise<Images | Product> {
        const result = await this.adminService.addImage(session.images, image, getImageDto);
        if (!(result as Product).titleUrl) {
          session.images = result;
        }

        return result;
    }

    @Post('/images/remove')
    async removeImage(
        @Session() session, 
        @Body() image: {image: string},
        @Query(ValidationPipe) getImageDto: GetImageDto ): Promise<Images | Product> {
        const result = await this.adminService.removeImage(session.images, image, getImageDto);
        if (!(result as Product).titleUrl) {
          session.images = result;
        }

        return result;
    }
  

  }
  