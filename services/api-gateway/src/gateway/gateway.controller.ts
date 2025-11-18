/**
 * Gateway Controller
 * Routes all API requests to appropriate microservices
 */

import {
  Controller,
  All,
  Req,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { JwtAuthGuard } from '@e-commerce/shared';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

@Controller('api')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  /**
   * Route auth requests to external auth service
   */
  @All('auth/*')
  async authRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/auth', '');
    const method = req.method;
    const body = method !== 'GET' && method !== 'DELETE' ? req.body : undefined;

    try {
      const response = await this.gatewayService.forwardRequest(
        'auth',
        `/auth${path}`,
        method,
        body,
        this.getHeaders(req),
      );
      res.status(200).json(response);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'GATEWAY_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
      });
    }
  }

  /**
   * Route product requests
   */
  @All('products/*')
  async productsRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/products', '');
    return this.routeRequest('products', `/products${path}`, req, res);
  }

  /**
   * Route category requests
   */
  @All('categories/*')
  async categoriesRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/categories', '');
    return this.routeRequest('products', `/categories${path}`, req, res);
  }

  /**
   * Route cart requests (requires auth)
   */
  @All('cart/*')
  @UseGuards(JwtAuthGuard)
  async cartRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/cart', '');
    return this.routeRequest('cart', `/cart${path}`, req, res);
  }

  /**
   * Route order requests (requires auth)
   */
  @All('orders/*')
  @UseGuards(JwtAuthGuard)
  async ordersRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/orders', '');
    return this.routeRequest('orders', `/orders${path}`, req, res);
  }

  /**
   * Route payment requests (requires auth)
   */
  @All('payu/*')
  @UseGuards(JwtAuthGuard)
  async paymentRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/payu', '');
    return this.routeRequest('orders', `/payu${path}`, req, res);
  }

  /**
   * Route warehouse requests (requires auth)
   */
  @All('warehouse/*')
  @UseGuards(JwtAuthGuard)
  async warehouseRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/warehouse', '');
    return this.routeRequest('warehouse', `/warehouse${path}`, req, res);
  }

  /**
   * Route user requests (requires auth)
   */
  @All('users/*')
  @UseGuards(JwtAuthGuard)
  async usersRoute(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    const path = req.url.replace('/api/users', '');
    return this.routeRequest('users', `/users${path}`, req, res);
  }

  /**
   * Helper to route request
   */
  private async routeRequest(
    serviceName: string,
    path: string,
    req: ExpressRequest,
    res: ExpressResponse,
  ) {
    const method = req.method;
    const body = method !== 'GET' && method !== 'DELETE' ? req.body : undefined;

    try {
      const response = await this.gatewayService.forwardRequest(
        serviceName,
        path,
        method,
        body,
        this.getHeaders(req),
      );
      res.status(200).json(response);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'GATEWAY_ERROR',
          message: error.response?.data?.error?.message || error.message,
        },
      });
    }
  }

  /**
   * Get headers from request
   */
  private getHeaders(req: ExpressRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Forward user ID if available from JWT guard
    if ((req as any).user?.id) {
      headers['X-User-Id'] = (req as any).user.id;
    }

    return headers;
  }
}

