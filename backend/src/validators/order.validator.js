import { z } from "zod";

export const checkoutSchema = z.object({
  address: z.string().min(10).max(255),
  deliveryType: z.enum(["STANDARD", "SAME_DAY"]).default("SAME_DAY")
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PACKING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED"
  ])
});
