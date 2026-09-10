import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerType } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductsRepository } from '../products/products.repository';
import { SellerProductEntity } from '../products/entities/seller-product.entity';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly productsRepo: ProductsRepository,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
  ) {}

  async rejectIndependentProduct(productId: string, reason?: string) {
    const product =
      await this.productsRepo.findSellerProductByIdForAccess(productId);
    if (!product || product.sellerType !== SellerType.INDEPENDENT) {
      throw new NotFoundException('Product not found');
    }

    const master = product.masterProduct;
    if (!master) {
      throw new NotFoundException('Product not found');
    }

    const rejectionReason =
      reason?.trim() ||
      'This product was rejected by the platform review team.';
    const attrs = { ...master.attributes };
    attrs.status = 'rejected';
    attrs.rejectionReason = rejectionReason;

    master.attributes = attrs;
    await this.productsRepo.saveMasterProduct(master);
    await this.productsRepo.updateSellerProduct(product.id, {
      isActive: false,
    });

    const sellerUserId = await this.resolveSellerUserId(product);
    if (sellerUserId) {
      const productName = master.name ?? product.title;
      await this.notificationsService.notifyUser(
        sellerUserId,
        'Product Rejected',
        `Your product "${productName}" was rejected. Reason: ${rejectionReason}`,
        {
          type: 'product_rejected',
          productId: product.id,
          productName,
          rejectionReason,
        },
      );
    }

    const saved = await this.productsRepo.findSellerProductByIdForAccess(
      product.id,
    );
    return this.mapProductResponse(saved!);
  }

  private async resolveSellerUserId(product: SellerProductEntity) {
    if (!product.independentSellerId) return null;
    const independent = await this.independentSellers.findOne({
      where: { id: product.independentSellerId },
    });
    if (!independent) return null;
    const seller = await this.sellerProfiles.findOne({
      where: { id: independent.sellerProfileId },
    });
    return seller?.userId ?? null;
  }

  private mapProductResponse(product: SellerProductEntity) {
    const master = product.masterProduct;
    const attrs = master?.attributes ?? {};
    return {
      id: product.id,
      name: master?.name ?? product.title,
      status: typeof attrs.status === 'string' ? attrs.status : 'rejected',
      rejectionReason:
        typeof attrs.rejectionReason === 'string'
          ? attrs.rejectionReason
          : undefined,
      independentSellerId: product.independentSellerId,
      isActive: product.isActive,
    };
  }
}
