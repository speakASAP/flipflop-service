/**
 * Users Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../shared/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { SettingsService } from '../../../../shared/settings/settings.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private logger: LoggerService,
    private settingsService: SettingsService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'isAdmin', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'phone',
        'isAdmin',
        'isEmailVerified',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`User updated: ${id}`, { userId: id });

    return updatedUser;
  }

  /**
   * Update user settings/preferences
   */
  async updateSettings(
    id: string,
    settingsDto: any,
  ): Promise<User> {
    const user = await this.findById(id);

    // Merge preferences
    const currentPreferences = user.preferences || {};
    user.preferences = {
      ...currentPreferences,
      ...settingsDto,
    };

    const updatedUser = await this.userRepository.save(user);

    // Invalidate settings cache if envOverrides were updated
    if (settingsDto.envOverrides) {
      // Settings cache will be refreshed on next access
    }

    this.logger.log(`User settings updated: ${id}`, {
      userId: id,
      updatedFields: Object.keys(settingsDto),
    });

    return updatedUser;
  }

  /**
   * Get merged settings for a user (includes .env, user preferences, and admin settings)
   */
  async getMergedSettings(userId: string): Promise<Record<string, any>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'preferences'],
    });

    return await this.settingsService.getMergedSettings(
      userId,
      user?.preferences,
    );
  }
}

