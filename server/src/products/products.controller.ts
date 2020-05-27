import { AuthGuard } from '@nestjs/passport';
import {
  Controller,
  Get,
  Param,
  Query,
  ValidationPipe,
  Delete,
  UseGuards,
  Post,
  Body,
  Patch,
  Headers,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products';
import { ProductsWithPagination, Product } from './models/product.model';
import { GetProductDto } from './dto/get-product';
import { Category } from './models/category.model';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/utils/get-user.decorator';
import { User } from '../auth/models/user.model';

@Controller('api/products')
export class ProductsController {
  constructor(private productService: ProductsService) {}

  @Get()
  getProducts(
    @Query(ValidationPipe) getProductsDto: GetProductsDto,
    @Headers('lang') lang: string,
  ): Promise<ProductsWithPagination> {
    return this.productService.getProducts(getProductsDto, lang);
  }

  @Get('/categories')
  getCategories(@Headers('lang') lang: string): Promise<Category[]> {
    return this.productService.getCategories(lang);
  }

  @Get('/search')
  getproductsTtitles(@Query('query') query: string): Promise<string[]> {
    return this.productService.getProductsTitles(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/all')
  getAllProducts(@Headers('lang') lang: string): Promise<Product[]> {
    return this.productService.getAllProducts(lang);
  }

  @Get('/:name')
  getProductByName(
    @Query() getProductDto: GetProductDto,
    @Param('name') name: string,
  ): Promise<Product> {
    return this.productService.getProductByName(name, getProductDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/:name')
  deleteProductByName(@Param('name') name: string): Promise<void> {
    return this.productService.deleteProductByName(name);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/add')
  addProduct(@Body() productReq, @GetUser() user: User): Promise<void> {
    return this.productService.addProduct(productReq, user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/edit')
  editProduct(@Body() productReq): Promise<void> {
    return this.productService.editProduct(productReq);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/categories/all')
  getAllCategories(@Headers('lang') lang: string): Promise<any> {
    return this.productService.getAllCategories(lang);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/categories/edit')
  editCategory(@Body() categoryReq): Promise<void> {
    return this.productService.editCategory(categoryReq);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/categories/:name')
  deleteCategoryByName(@Param('name') name: string): Promise<void> {
    return this.productService.deleteCategoryByName(name);
  }
}
