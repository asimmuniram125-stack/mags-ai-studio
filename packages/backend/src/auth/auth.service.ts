import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto, ipAddress: string): Promise<AuthResponseDto> {
    const { email, username, password, confirmPassword, firstName, lastName } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    this.validatePasswordStrength(password);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const memberRole = await this.prisma.role.findUnique({
      where: { name: 'MEMBER' },
    });

    if (memberRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: memberRole.id,
        },
      });
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        ipAddress,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return this.buildAuthResponse(user, accessToken, refreshToken);
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto, ipAddress: string): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const lockoutKey = `lockout:${email}`;
    const lockoutCount = await this.cacheManager.get<number>(lockoutKey);

    if (lockoutCount && lockoutCount >= 5) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      await this.cacheManager.set(lockoutKey, (lockoutCount || 0) + 1, 15 * 1000);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.cacheManager.set(lockoutKey, (lockoutCount || 0) + 1, 15 * 1000);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    await this.cacheManager.del(lockoutKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        ipAddress,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return this.buildAuthResponse(user, accessToken, refreshToken);
  }

  /**
   * Logout user
   */
  async logout(userId: string, token?: string): Promise<void> {
    if (!token) return;

    try {
      const payload = this.jwtService.decode(token) as any;
      const expiresIn = (payload.exp - Math.floor(Date.now() / 1000)) * 1000;

      if (expiresIn > 0) {
        await this.cacheManager.set(`blacklist:${token}`, true, expiresIn);
      }
    } catch (error) {
      // Token decode error, skip
    }
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken) as any;
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user.id);

      return this.buildAuthResponse(user, accessToken, newRefreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.buildUserResponse(user);
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = user.userRoles
      .flatMap((ur: any) => ur.role.permissions)
      .map((rp: any) => rp.permission.name) || [];

    const roles = user.userRoles.map((ur: any) => ur.role.name) || [];

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        roles,
        permissions,
      },
      {
        expiresIn: '15m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
  }

  /**
   * Build auth response
   */
  private buildAuthResponse(user: any, accessToken: string, refreshToken: string): AuthResponseDto {
    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
    };
  }

  /**
   * Build user response
   */
  private buildUserResponse(user: any) {
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissions = user.userRoles
      .flatMap((ur: any) => ur.role.permissions)
      .map((rp: any) => rp.permission.name);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      roles,
      permissions,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
