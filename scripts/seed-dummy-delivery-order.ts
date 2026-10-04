/**
 * Inserts a sub-order in READY_FOR_PICKUP for delivery partner app testing.
 *
 * Prerequisites:
 *   1. Local DB running; main catalog seeded once (`npm run seed`).
 *   2. Run: `npm run seed:dummy-delivery`
 *   Full reset + catalog + dummy order: `npm run seed:fresh`
 *
 * In the partner app: dev-approve → go online → Requests tab.
 * Store scope: use Fresh Mart or all sellers.
 *
 * Cleanup later: delete sub_orders where order_number LIKE 'DUMMY-QM-%' (cascade).
 */
import { NestFactory } from '@nestjs/core';
import { DataSource, In } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import {
  ActorType,
  DeliveryAssignmentStatus,
  ParentOrderStatus,
  PaymentStatus,
  SellerType,
  StoreStatus,
  SubOrderStatus,
  UserStatus,
  UserType,
} from '../src/common/enums';
import { CustomerAddressEntity } from '../src/modules/customers/entities/customer-address.entity';
import { CustomerProfileEntity } from '../src/modules/customers/entities/customer-profile.entity';
import { DeliveryAssignmentEntity } from '../src/modules/delivery/entities/delivery-assignment.entity';
import { OrderItemEntity } from '../src/modules/orders/entities/order-item.entity';
import { OrderStatusHistoryEntity } from '../src/modules/orders/entities/order-status-history.entity';
import { ParentOrderEntity } from '../src/modules/orders/entities/parent-order.entity';
import { SubOrderEntity } from '../src/modules/orders/entities/sub-order.entity';
import { SellerProductEntity } from '../src/modules/products/entities/seller-product.entity';
import { StoreEntity } from '../src/modules/stores/entities/store.entity';
import { UserEntity } from '../src/modules/users/entities/user.entity';

const DUMMY_SUB_ORDER_PREFIX = 'DUMMY-QM-';
const DUMMY_PARENT_ORDER_NUMBER = 'DUMMY-QM-PARENT-10001';
const DUMMY_SUB_ORDER_NUMBER = `${DUMMY_SUB_ORDER_PREFIX}10001`;
const DUMMY_CUSTOMER_EMAIL = 'customer+dummy@m3bd.test';

const ACTIVE_ASSIGNMENT_STATUSES = [
  DeliveryAssignmentStatus.PENDING,
  DeliveryAssignmentStatus.ACCEPTED,
  DeliveryAssignmentStatus.IN_PROGRESS,
];

const QTY = 6;
const UNIT_PRICE = 70;
const LINE_TOTAL = QTY * UNIT_PRICE;
const DELIVERY_FEE = 45;
const PARENT_TOTAL = LINE_TOTAL + DELIVERY_FEE;

async function seedDummyDeliveryOrder() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  const subOrdersRepo = ds.getRepository(SubOrderEntity);
  const assignmentsRepo = ds.getRepository(DeliveryAssignmentEntity);

  const existing = await subOrdersRepo.findOne({
    where: { orderNumber: DUMMY_SUB_ORDER_NUMBER },
  });

  if (existing) {
    const activeAssignment = await assignmentsRepo.findOne({
      where: {
        subOrderId: existing.id,
        status: In(ACTIVE_ASSIGNMENT_STATUSES),
      },
    });
    if (existing.status === SubOrderStatus.READY_FOR_PICKUP && !activeAssignment) {
      console.log(
        'Dummy delivery order already exists (READY_FOR_PICKUP, no active assignment).',
      );
    } else if (activeAssignment) {
      console.log('Dummy delivery order already exists (has active assignment).');
    } else {
      console.log(
        `Dummy delivery order already exists (status: ${existing.status}).`,
      );
    }
    console.log('Sub-order ID:', existing.id);
    console.log('Order number:', existing.orderNumber);
    await app.close();
    return;
  }

  let store = await ds.getRepository(StoreEntity).findOne({
    where: { name: 'Fresh Mart', status: StoreStatus.ACTIVE },
  });
  if (!store) {
    store = await ds.getRepository(StoreEntity).findOne({
      where: { status: StoreStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }
  if (!store) {
    console.error('No active store found. Run `npm run seed` first.');
    await app.close();
    process.exit(1);
  }

  const storeProduct = await ds.getRepository(SellerProductEntity).findOne({
    where: { storeId: store.id, sellerType: SellerType.STORE, isActive: true },
    order: { createdAt: 'ASC' },
  });
  if (!storeProduct) {
    console.error('No store product found for store', store.id, '. Run `npm run seed` first.');
    await app.close();
    process.exit(1);
  }

  let customerUser = await ds.getRepository(UserEntity).findOne({
    where: { email: DUMMY_CUSTOMER_EMAIL },
  });
  if (!customerUser) {
    customerUser = await ds.getRepository(UserEntity).save({
      email: DUMMY_CUSTOMER_EMAIL,
      passwordHash: await argon2.hash('password123'),
      userType: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
    });
  }

  let customerProfile = await ds.getRepository(CustomerProfileEntity).findOne({
    where: { userId: customerUser.id },
  });
  if (!customerProfile) {
    customerProfile = await ds.getRepository(CustomerProfileEntity).save({
      userId: customerUser.id,
      fullName: 'Dummy Test Customer',
      address: '12 Janpath, New Delhi',
    });
  }

  const addressRepo = ds.getRepository(CustomerAddressEntity);
  let deliveryAddress = await addressRepo.findOne({
    where: { customerId: customerProfile.id, isDefault: true },
  });
  if (!deliveryAddress) {
    deliveryAddress = await addressRepo.save({
      customerId: customerProfile.id,
      label: 'Home',
      fullAddress: '12 Janpath, New Delhi',
      lat: '28.6129000',
      lng: '77.2295000',
      isDefault: true,
    });
  }

  const parentOrdersRepo = ds.getRepository(ParentOrderEntity);
  let parent = await parentOrdersRepo.findOne({
    where: { orderNumber: DUMMY_PARENT_ORDER_NUMBER },
  });

  if (!parent) {
    parent = await parentOrdersRepo.save({
      customerId: customerProfile.id,
      orderNumber: DUMMY_PARENT_ORDER_NUMBER,
      status: ParentOrderStatus.CONFIRMED,
      subtotal: LINE_TOTAL.toFixed(2),
      discountTotal: '0.00',
      deliveryFee: DELIVERY_FEE.toFixed(2),
      taxTotal: '0.00',
      platformFee: '0.00',
      chargeBreakdown: [],
      totalPayable: PARENT_TOTAL.toFixed(2),
      paymentStatus: PaymentStatus.SUCCESS,
    });
  }

  const subOrder = await subOrdersRepo.save({
    parentOrderId: parent.id,
    sellerType: SellerType.STORE,
    storeId: store.id,
    orderNumber: DUMMY_SUB_ORDER_NUMBER,
    status: SubOrderStatus.READY_FOR_PICKUP,
    subtotal: LINE_TOTAL.toFixed(2),
    discountTotal: '0.00',
    deliveryFee: DELIVERY_FEE.toFixed(2),
    commissionAmount: '0.00',
  });

  await ds.getRepository(OrderItemEntity).save({
    subOrderId: subOrder.id,
    sellerProductId: storeProduct.id,
    quantity: QTY,
    unitPrice: UNIT_PRICE.toFixed(2),
    lineTotal: LINE_TOTAL.toFixed(2),
  });

  await ds.getRepository(OrderStatusHistoryEntity).save({
    subOrderId: subOrder.id,
    fromStatus: SubOrderStatus.PREPARING,
    toStatus: SubOrderStatus.READY_FOR_PICKUP,
    actorType: ActorType.SELLER,
    metadata: { source: 'seed-dummy-delivery-order' },
  });

  console.log('Dummy ready-for-delivery order created.');
  console.log('Store:', store.name, `(${store.id})`);
  console.log('Pickup:', store.address, `lat=${store.lat}, lng=${store.lng}`);
  console.log('Drop:', deliveryAddress.fullAddress, `lat=${deliveryAddress.lat}, lng=${deliveryAddress.lng}`);
  console.log('Parent order ID:', parent.id);
  console.log('Sub-order ID:', subOrder.id);
  console.log('Sub-order number:', subOrder.orderNumber);
  console.log('Status:', subOrder.status);
  console.log(
    'Next: partner app → dev-approve → online → Requests (assignments created on list).',
  );

  await app.close();
}

void seedDummyDeliveryOrder().catch((err) => {
  console.error(err);
  process.exit(1);
});
