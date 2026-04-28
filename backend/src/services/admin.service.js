import { prisma } from "../config/prisma.js";

export class AdminService {
  async getDashboardMetrics() {
    const [orderCount, deliveredCount, productCount, pendingOrders, salesAggregate] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: { status: "DELIVERED" }
        }),
        prisma.product.count(),
        prisma.order.count({
          where: {
            status: {
              in: ["PENDING", "CONFIRMED", "PACKING", "OUT_FOR_DELIVERY"]
            }
          }
        }),
        prisma.order.aggregate({
          _sum: {
            total: true
          }
        })
      ]);

    const recentOrders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        delivery: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    return {
      totals: {
        orders: orderCount,
        delivered: deliveredCount,
        products: productCount,
        pendingOrders,
        sales: Number(salesAggregate._sum.total || 0)
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        createdAt: order.createdAt,
        customer: order.user,
        delivery: order.delivery
      }))
    };
  }
}
