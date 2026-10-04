import { SellerProductEntity } from './entities/seller-product.entity';

type ProductAttributes = {
  productType?: string;
  isVeg?: boolean;
  prepTimeMinutes?: number;
};

export function mapSellerProductForCustomer(product: SellerProductEntity) {
  const attrs = (product.masterProduct?.attributes ?? {}) as ProductAttributes;
  const productType =
    attrs.productType === 'food' ? 'food' : ('retail' as 'food' | 'retail');

  return {
    ...product,
    productType,
    isVeg: typeof attrs.isVeg === 'boolean' ? attrs.isVeg : undefined,
    prepTimeMinutes:
      typeof attrs.prepTimeMinutes === 'number'
        ? attrs.prepTimeMinutes
        : undefined,
  };
}

export function mapSellerProductsForCustomer(products: SellerProductEntity[]) {
  return products.map(mapSellerProductForCustomer);
}
