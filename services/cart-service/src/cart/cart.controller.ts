/**
 * Cart Controller
 * Handles HTTP requests for cart operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard, ApiResponse } from '@flipflop/shared';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req: any) {
    const cart = await this.cartService.getCart(req.user.id);
    return ApiResponse.success(cart);
  }

  @Post('items')
  async addToCart(@Request() req: any, @Body() dto: AddToCartDto) {
    const item = await this.cartService.addToCart(
      req.user.id,
      dto.productId,
      dto.variantId,
      dto.quantity,
    );
    return ApiResponse.success(item);
  }

  @Put('items/:id')
  async updateCartItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const item = await this.cartService.updateCartItem(req.user.id, id, dto.quantity);
    return ApiResponse.success(item);
  }

  @Delete('items/:id')
  async removeFromCart(@Request() req: any, @Param('id') id: string) {
    const result = await this.cartService.removeFromCart(req.user.id, id);
    return ApiResponse.success(result);
  }

  @Delete()
  async clearCart(@Request() req: any) {
    const result = await this.cartService.clearCart(req.user.id);
    return ApiResponse.success(result);
  }
}

