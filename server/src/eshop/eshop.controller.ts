import { Controller, Body, Session, Post, Get, UseGuards, Param, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { EshopService } from './eshop.service';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Page } from './models/page.model';

@Controller('api/eshop')
export class EshopController {
  constructor(private eshopService: EshopService) {}

  @Get('/config')
  getConfig(): { config: string } {
    try {
      return {
        config: Buffer.from(
          JSON.stringify(
            Object.keys(process.env)
              .filter((key) => key.includes('FE_'))
              .reduce((prev, curr) => ({ ...prev, [curr]: process.env[curr] }), {})
          )
        ).toString('base64'),
      };
    } catch {
      return { config: '' };
    }
  }

  @Post('/contact')
  sendContact(@Body() contactDto: ContactDto, @Session() session): void {
    this.eshopService.sendContact(contactDto, session.cart);
  }

  @Get('/page/all')
  getPages(): Promise<Page[]> {
    return this.eshopService.getPages();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/page')
  addOrEditPage(@Body() pageDto: PageDto): Promise<Page> {
    return this.eshopService.addOrEditPage(pageDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('/page/:titleUrl')
  getPage(@Param('titleUrl') titleUrl: string): Promise<Page> {
    return this.eshopService.getPage(titleUrl);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/page/:titleUrl')
  deletePage(@Param('titleUrl') titleUrl: string): Promise<void> {
    return this.eshopService.deletePage(titleUrl);
  }
}
