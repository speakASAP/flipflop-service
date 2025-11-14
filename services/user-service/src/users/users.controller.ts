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
}

