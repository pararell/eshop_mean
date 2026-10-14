import { AuthGuard } from '@nestjs/passport';
import { Controller, Get, Param, Query, ValidationPipe, Delete, UseGuards, Post, Body, Patch, Headers } from '@nestjs/common';

import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products';
import type { CategoryInput, ProductInput } from '@eshop/shared';
import { LocalizedProduct, Product, ProductsPage } from './models/product.model';
import { GetProductDto } from './dto/get-product';
import { CategoryWithProducts, LocalizedCategory } from './models/category.model';
import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/utils/get-user.decorator';
import { User } from '../auth/models/user.model';

@Controller('api/products')
export class ProductsController {
  constructor(private productService: ProductsService) {}

  @Get()
  getProducts(@Query(ValidationPipe) getProductsDto: GetProductsDto, @Headers('lang') lang: string): Promise<ProductsPage> {
    return this.productService.getProducts(getProductsDto, lang);
  }

  @Get('/categories')
  getCategories(@Headers('lang') lang: string): Promise<LocalizedCategory[]> {
    return this.productService.getCategories(lang);
  }

  @Get('/search')
  getproductsTtitles(@Query('query') query: string): Promise<string[]> {
    return this.productService.getProductsTitles(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/all')
  getAllProducts(@Headers('lang') lang: string): Promise<LocalizedProduct[]> {
    return this.productService.getAllProducts(lang);
  }

  @Get('/:name')
  getProductByName(@Query() getProductDto: GetProductDto, @Param('name') name: string): Promise<LocalizedProduct | Product> {
    return this.productService.getProductByName(name, getProductDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/:name')
  deleteProductByName(@Param('name') name: string): Promise<void> {
    return this.productService.deleteProductByName(name);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/add')
  addProduct(@Body() productReq: ProductInput, @GetUser() user: User): Promise<void> {
    return this.productService.addProduct(productReq, user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/edit')
  editProduct(@Body() productReq: ProductInput): Promise<void> {
    return this.productService.editProduct(productReq);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/categories/all')
  getAllCategories(@Headers('lang') lang: string): Promise<CategoryWithProducts[]> {
    return this.productService.getAllCategories(lang);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch('/categories/edit')
  editCategory(@Body() categoryReq: CategoryInput): Promise<void> {
    return this.productService.editCategory(categoryReq);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/categories/:name')
  deleteCategoryByName(@Param('name') name: string): Promise<void> {
    return this.productService.deleteCategoryByName(name);
  }
}
