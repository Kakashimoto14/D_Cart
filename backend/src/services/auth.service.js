import { prisma } from "../config/prisma.js";
import { Admin } from "../models/Admin.js";
import { Customer } from "../models/Customer.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../utils/AppError.js";
import { generateToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";

export class AuthService {
  buildUserEntity(user) {
    return user.role === ROLES.ADMIN ? new Admin(user) : new Customer(user);
  }

  async register(payload) {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (existingUser) {
      throw new AppError("Email is already registered.", 409);
    }

    const hashedPassword = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: ROLES.CUSTOMER,
        cart: {
          create: {}
        }
      }
    });

    const entity = this.buildUserEntity(user);
    const token = generateToken({ sub: user.id, role: user.role });

    return {
      token,
      user: entity.getProfile()
    };
  }

  async login(payload) {
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    const isValidPassword = await comparePassword(payload.password, user.password);

    if (!isValidPassword) {
      throw new AppError("Invalid email or password.", 401);
    }

    const entity = this.buildUserEntity(user);
    const token = generateToken({ sub: user.id, role: user.role });

    return {
      token,
      user: entity.getProfile()
    };
  }

  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError("User not found.", 404);
    }

    return this.buildUserEntity(user).getProfile();
  }
}
