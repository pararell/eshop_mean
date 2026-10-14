import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as cloudinary from 'cloudinary';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

import { ProductModel, Product } from '../products/models/product.model';
import { Images } from './utils/images';
import { AddProductImageDto } from './dto/add-image.dto';
import { ImageDto } from './dto/image.dto';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

/** Image library as stored in the session (a serialized Images instance) */
type SessionImages = Pick<Images, 'all'>;

@Injectable()
export class AdminService {
  constructor(@InjectModel('Product') private productModel: ProductModel) {}

  async getImages(images: SessionImages | undefined): Promise<SessionImages> {
    return (await images) || new Images({ all: [] });
  }

  async addImage(images: SessionImages | undefined, imageDto: ImageDto, addImageDto: AddProductImageDto): Promise<Images | Product> {
    const { image } = imageDto;
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });
    const product = titleUrl ? await this.productModel.findOneAndUpdate({ titleUrl }, { $push: { images: image } }, { new: true }) : null;

    if (!product) {
      existImages.add(image);
    }

    return product || existImages;
  }

  async uploadImage(images: SessionImages | undefined, file: Express.Multer.File, addImageDto: AddProductImageDto): Promise<Images | Product> {
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });
    const uploadedImage = await this.uploadToCloudinary(file);
    const image = uploadedImage.secure_url;

    const product = titleUrl ? await this.productModel.findOneAndUpdate({ titleUrl }, { $push: { images: image } }, { new: true }) : null;

    if (!product) {
      existImages.add(image);
    }

    return product || existImages;
  }

  async removeImage(images: SessionImages | undefined, imageDto: ImageDto, addImageDto: AddProductImageDto): Promise<Images | Product> {
    const { image } = imageDto;
    const { titleUrl } = addImageDto;
    const existImages = await new Images(images || { all: [] });
    const product = titleUrl ? await this.productModel.findOneAndUpdate({ titleUrl }, { $pull: { images: image } }, { new: true }) : null;

    existImages.remove(image);

    return product || existImages;
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const cld_upload_stream = cloudinary.v2.uploader.upload_stream(
        {
          resource_type: 'auto',
          use_filename: true,
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
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
