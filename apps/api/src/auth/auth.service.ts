import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../common/entities/user.entity';
import { RefreshToken } from '../common/entities/refresh-token.entity';
import { PasswordResetToken } from '../common/entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private resetTokensRepo: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      password: hashed,
      role: dto.role,
    });
    await this.usersRepo.save(user);
    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refresh(rawToken: string) {
    const hashed = this.hashToken(rawToken);
    const stored = await this.refreshTokensRepo.findOne({
      where: { token: hashed },
      relations: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.refreshTokensRepo.remove(stored);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.refreshTokensRepo.remove(stored);
    return this.generateTokens(stored.user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokensRepo.delete({ userId });
  }

  async handleGoogleLogin(googleUser: {
    googleId: string;
    email: string;
    displayName: string;
  }) {
    let user = await this.usersRepo.findOne({
      where: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
    });

    if (!user) {
      user = this.usersRepo.create({
        email: googleUser.email,
        googleId: googleUser.googleId,
        role: UserRole.INFLUENCER,
        isVerified: true,
      });
      await this.usersRepo.save(user);
    } else if (!user.googleId) {
      user.googleId = googleUser.googleId;
      user.isVerified = true;
      await this.usersRepo.save(user);
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET', 'changeme'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d') as any,
    });

    const rawRefresh = uuidv4();
    const hashedRefresh = this.hashToken(rawRefresh);

    const daysStr = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '30d');
    const days = parseInt(daysStr);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const refreshToken = this.refreshTokensRepo.create({
      token: hashedRefresh,
      userId: user.id,
      expiresAt,
    });
    await this.refreshTokensRepo.save(refreshToken);

    return {
      access_token: accessToken,
      refresh_token: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user || !user.password) return;

    await this.resetTokensRepo.delete({ userId: user.id });

    const rawToken = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await this.resetTokensRepo.save(
      this.resetTokensRepo.create({ token: rawToken, userId: user.id, expiresAt }),
    );

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetTokensRepo.findOne({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      await this.resetTokensRepo.delete({ token });
      throw new BadRequestException('Token is invalid or expired');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.update(record.userId, { password: hashed });
    await this.resetTokensRepo.delete({ token });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
