import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ProductModel, Product } from '../products/models/product.model';
import { Images } from './images';
import { GetImageDto } from './dto/get-image.dto';


@Injectable()
export class AdminService {
  constructor(
      @InjectModel('Product') private productModel: ProductModel
      ) {}

      async getImages(images: Images) {
        return await images || new Images([]);
      }

      async addImage(images: Images, {image}, getImageDto: GetImageDto):Promise<Images | Product> {
        const {titleUrl} = getImageDto;
        const existImages = await new Images(images || []);
        const product = titleUrl
          ? await this.productModel
            .findOneAndUpdate({ titleUrl }, { $push: { images: image } }, { new: true })
          : null;

        if (!product) {
          existImages.add(image);
        }

        return product || existImages;
      }

      async removeImage(images: Images, {image}, getImageDto: GetImageDto):Promise<Images | Product> {
        const {titleUrl} = getImageDto;
        const existImages = await new Images(images || []);
        const product = titleUrl
          ? await this.productModel
            .findOneAndUpdate({ titleUrl }, { $pull: { images: image } }, { new: true })
          : null;

        if (!product) {
          existImages.remove(image);
        }

        return product || existImages;
      }

}
