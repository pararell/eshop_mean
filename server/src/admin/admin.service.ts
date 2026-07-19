import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as cloudinary from 'cloudinary';
import * as streamifier from 'streamifier';

import { Product } from '../entities/product.entity';
import { Images } from './utils/images';
import { AddProductImageDto } from './dto/add-image.dto';
import { ImageDto } from './dto/image.dto';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

@Injectable()
export class AdminService {
  constructor(@InjectRepository(Product) private productRepository: Repository<Product>) {}

  async getImages(images: Images) {
    return (await images) || new Images({ all: [] });
  }

  async addImage(
    images: Images,
    imageDto: ImageDto,
    addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const { image } = imageDto;
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });
    const product = titleUrl
      ? await this.productRepository.findOne({ where: { titleUrl } })
      : null;

    if (product) {
      const updatedImages = [...(product.images || []), image];
      await this.productRepository.update({ titleUrl }, { images: updatedImages });
      const updated = await this.productRepository.findOne({ where: { titleUrl } });
      return updated;
    }

    if (!product) {
      existImages.add(image);
    }

    return product || existImages;
  }

  async uploadImage(
    images: Images,
    file,
    addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });
    const uploadedImage = await this.uploadToCloudinary(file);
    const image = uploadedImage.secure_url;

    const product = titleUrl
      ? await this.productRepository.findOne({ where: { titleUrl } })
      : null;

    if (product) {
      const updatedImages = [...(product.images || []), image];
      await this.productRepository.update({ titleUrl }, { images: updatedImages });
      const updated = await this.productRepository.findOne({ where: { titleUrl } });
      return updated;
    }

    if (!product) {
      existImages.add(image);
    }

    return product || existImages;
  }

  async removeImage(
    images: Images,
    imageDto: ImageDto,
    addImageDto: AddProductImageDto,
  ): Promise<Images | Product> {
    const { image } = imageDto;
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });

    if (titleUrl) {
      const product = await this.productRepository.findOne({ where: { titleUrl } });
      if (product) {
        const updatedImages = (product.images || []).filter((img) => img !== image);
        await this.productRepository.update({ titleUrl }, { images: updatedImages });
        const updated = await this.productRepository.findOne({ where: { titleUrl } });
        return updated;
      }
    }

    existImages.remove(image);
    return existImages;
  }

  private async uploadToCloudinary(file): Promise<any> {
    return new Promise((resolve, reject) => {
      const cld_upload_stream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: 'auto',
          use_filename: true,
        },
        (error: any, result: any) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(cld_upload_stream);
    });
  }
}