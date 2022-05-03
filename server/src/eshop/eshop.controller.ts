import { Controller, Body, Session, Post, Get, UseGuards, Param, Delete, Headers, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { EshopService } from './eshop.service';
import { ContactDto } from './dto/contact.dto';
import { PageDto } from './dto/page.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Page } from './models/page.model';
import { Theme } from './models/theme.model';
import { Config } from './models/config.model';

@Controller('api/eshop')
export class EshopController {
  constructor(private eshopService: EshopService) {}

  @Get('/config')
  getConfig(@Session() session): Promise<{ config: string }> {
    return this.eshopService.getConfig(session);
  }

  @Post('/contact')
  sendContact(@Body() contactDto: ContactDto, @Session() session, @Headers('lang') lang: string): void {
    this.eshopService.sendContact(contactDto, session.cart, lang);
  }

  @Get('/page/all')
  getPages(@Headers('lang') lang: string, @Query('titles') titles: boolean): Promise<Page[]> {
    return this.eshopService.getPages(lang, titles);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/page')
  addOrEditPage(@Body() pageDto: PageDto): Promise<Page> {
    return this.eshopService.addOrEditPage(pageDto);
  }

  @Get('/page/:titleUrl')
  getPage(@Param('titleUrl') titleUrl: string, @Headers('lang') lang: string): Promise<Page> {
    return this.eshopService.getPage(titleUrl, lang);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/page/:titleUrl')
  deletePage(@Param('titleUrl') titleUrl: string): Promise<void> {
    return this.eshopService.deletePage(titleUrl);
  }

  @Get('/theme/all')
  getThemes(): Promise<Theme[]> {
    return this.eshopService.getThemes();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/theme')
  addOrEditTheme(@Body() themeDto): Promise<Theme> {
    return this.eshopService.addOrEditTheme(themeDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/theme/:titleUrl')
  deleteTheme(@Param('titleUrl') titleUrl: string): Promise<void> {
    return this.eshopService.deleteTheme(titleUrl);
  }

  @Get('/config/all')
  getConfigs(): Promise<Config[]> {
    return this.eshopService.getConfigs();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('/config')
  addOrEditConfig(@Body() configDto): Promise<Config> {
    return this.eshopService.addOrEditConfig(configDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete('/config/:titleUrl')
  deleteConfig(@Param('titleUrl') titleUrl: string): Promise<void> {
    return this.eshopService.deleteConfig(titleUrl);
  }
}
