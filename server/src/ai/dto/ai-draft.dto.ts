import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

import { LIMITS } from '../draft-schema';

/** Request body of POST /api/admin/products/ai-draft */
export class AiDraftRequestDto {
  /** Cloudinary URLs of already uploaded product images (the first ones are sent to the model) */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, { each: true })
  imageUrls?: string[];

  /** A few words from the admin, e.g. "men's winter jacket, black, down, L-XXL" */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

  /** Optional pasted supplier text */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  supplierText?: string;
}

/** Request body of POST /api/admin/themes/ai-draft */
export class AiThemeDraftRequestDto {
  /** A few words about the shop and the look, e.g. "alpine hiking shop, calm, autumn colors" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  brief!: string;
}

// The model's answer. Limits are generous (the normalizer trims SEO texts to their exact limits);
// anything structurally wrong rejects the draft.

export class AttributeDto {
  @IsString()
  @MaxLength(LIMITS.attributeName * 2)
  name!: string;

  @IsString()
  @MaxLength(LIMITS.attributeValue * 2)
  value!: string;
}

export class LanguageDraftDto {
  @IsString()
  @MaxLength(LIMITS.title * 2)
  title!: string;

  @IsString()
  @MaxLength(LIMITS.shortDescription * 2)
  shortDescription!: string;

  @IsString()
  @MaxLength(LIMITS.descriptionHtml * 2)
  descriptionHtml!: string;

  @IsArray()
  @ArrayMaxSize(LIMITS.attributes * 2)
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes!: AttributeDto[];

  @IsString()
  @MaxLength(LIMITS.seoTitle * 3)
  seoTitle!: string;

  @IsString()
  @MaxLength(LIMITS.metaDescription * 3)
  metaDescription!: string;
}

/** Language-independent part of the answer; `translations` is validated per language */
export class DraftDto {
  @IsString()
  @MaxLength(200)
  titleUrl!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  suggestedCategories!: string[];

  @IsArray()
  @IsString({ each: true })
  warnings!: string[];
}
