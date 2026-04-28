import { prisma } from "../config/prisma.js";
import { Delivery } from "../models/Delivery.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { SameDayDeliveryStrategy } from "../models/strategies/SameDayDeliveryStrategy.js";
import { StandardDeliveryStrategy } from "../models/strategies/StandardDeliveryStrategy.js";
import { ROLES } from "../constants/roles.js";
import { AppError } from "../utils/AppError.js";

export class OrderService {
  buildDeliveryStrategy(type) {
    return type === "STANDARD"
      ? new StandardDeliveryStrategy()
      : new SameDayDeliveryStrategy();
  }

  mapOrder(record) {
    return {
      id: record.id,
      userId: record.userId,
      total: Number(record.total),
      status: record.status,
      items: record.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
        product: item.product
      })),
      delivery: record.delivery
        ? {
            ...record.delivery,
            estimatedAt: record.delivery.estimatedAt
          }
        : null,
      createdAt: record.createdAt
    };
  }

  async checkout(userId, payload) {
    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError("Cart is empty.", 400);
      }

      const strategy = this.buildDeliveryStrategy(payload.deliveryType);
      const delivery = new Delivery({
        address: payload.address,
        strategy
      });

      delivery.validateServiceArea();

      const orderEntity = new Order({
        userId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: Number(item.product.price)
        }))
      });

      orderEntity.calculateTotal();

      for (const item of cart.items) {
        const productEntity = new Product(item.product);
        productEntity.reserveStock(item.quantity);

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: productEntity.stock
          }
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId,
          total: orderEntity.total,
          status: "PENDING",
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      const deliveryRecord = delivery.schedule(createdOrder.id);

      await tx.delivery.create({
        data: deliveryRecord
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      const order = await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          items: {
            include: {
              product: true
            }
          },
          delivery: true
        }
      });

      return this.mapOrder(order);
    });
  }

  async listOrders(user) {
    const where = user.role === ROLES.ADMIN ? {} : { userId: user.id };

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        delivery: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async updateStatus(orderId, status) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        delivery: true
      }
    });

    if (!existing) {
      throw new AppError("Order not found.", 404);
    }

    const entity = new Order(existing);
    entity.markStatus(status);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: entity.status },
      include: {
        items: {
          include: {
            product: true
          }
        },
        delivery: true
      }
    });

    return this.mapOrder(updated);
  }
}
