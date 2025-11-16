/**
 * Users Controller
 */

import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ApiResponseUtil } from '../../../../shared/utils/api-response.util';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    return ApiResponseUtil.success(user);
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return ApiResponseUtil.success(user);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return ApiResponseUtil.success(user);
  }

  /**
   * Get user settings/preferences
   */
  @Get('settings')
  async getUserSettings(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    return ApiResponseUtil.success({
      preferences: user.preferences || {},
    });
  }

  /**
   * Update user settings/preferences
   */
  @Put('settings')
  async updateUserSettings(
    @Request() req,
    @Body() updateDto: UpdateUserSettingsDto,
  ) {
    const user = await this.usersService.updateSettings(req.user.id, updateDto);
    return ApiResponseUtil.success({
      preferences: user.preferences,
    });
  }

  /**
   * Check if user is admin
   */
  private async checkAdmin(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Get all users (admin only)
   */
  @Get('admin/list')
  async getAllUsers(
    @Request() req,
    @Query('search') search?: string,
    @Query('isAdmin') isAdmin?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    await this.checkAdmin(req.user.id);
    const users = await this.usersService.findAll();

    // Apply filters
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.firstName?.toLowerCase().includes(searchLower) ||
          u.lastName?.toLowerCase().includes(searchLower),
      );
    }
    if (isAdmin !== undefined) {
      const isAdminBool = isAdmin === 'true';
      filteredUsers = filteredUsers.filter((u) => u.isAdmin === isAdminBool);
    }

    // Pagination
    const pageNum = page ? parseInt(String(page)) : 1;
    const limitNum = limit ? parseInt(String(limit)) : 20;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedUsers = filteredUsers.slice(start, end);

    return ApiResponseUtil.paginated(
      paginatedUsers,
      filteredUsers.length,
      pageNum,
      limitNum,
    );
  }

  /**
   * Update user (admin only)
   */
  @Put('admin/:id')
  async updateUserAdmin(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto & { isAdmin?: boolean },
  ) {
    await this.checkAdmin(req.user.id);
    const user = await this.usersService.update(id, updateUserDto);
    return ApiResponseUtil.success(user);
  }
}

