import { PaginatedResult } from '../../common/dto/pagination.dto';
import { SellerType } from '../../common/enums';

export const DUMMY_STORE_ID = '11111111-1111-4111-8111-111111111111';

export type DummySellerProduct = {
  id: string;
  sellerType: SellerType;
  storeId: string;
  independentSellerId: null;
  masterProductId: string;
  variantId: null;
  title: string;
  mrp: string;
  sellingPrice: string;
  isActive: true;
  masterProduct: {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    brand: string;
    baseUnit: string;
    attributes: Record<string, unknown>;
  };
  store: { id: string; name: string };
  independentSeller: null;
  inventory: {
    quantityAvailable: number;
    quantityReserved: number;
  };
};

const ITEMS: Array<{
  name: string;
  brand: string;
  unit: string;
  mrp: string;
  selling: string;
  qty: number;
  categoryId: string;
}> = [
  {
    name: 'Organic Milk 1L',
    brand: 'FarmFresh',
    unit: 'ltr',
    mrp: '80.00',
    selling: '70.00',
    qty: 40,
    categoryId: 'cat-3',
  },
  {
    name: 'Brown Bread 400g',
    brand: 'BakeHouse',
    unit: 'pc',
    mrp: '55.00',
    selling: '48.00',
    qty: 30,
    categoryId: 'cat-1',
  },
  {
    name: 'Free Range Eggs (12)',
    brand: 'HappyHen',
    unit: 'dozen',
    mrp: '120.00',
    selling: '99.00',
    qty: 25,
    categoryId: 'cat-3',
  },
  {
    name: 'Bananas 1kg',
    brand: 'FarmFresh',
    unit: 'kg',
    mrp: '70.00',
    selling: '58.00',
    qty: 50,
    categoryId: 'cat-2',
  },
  {
    name: 'Tomatoes 1kg',
    brand: 'GreenCart',
    unit: 'kg',
    mrp: '60.00',
    selling: '45.00',
    qty: 35,
    categoryId: 'cat-2',
  },
  {
    name: 'Onions 1kg',
    brand: 'GreenCart',
    unit: 'kg',
    mrp: '40.00',
    selling: '32.00',
    qty: 60,
    categoryId: 'cat-2',
  },
  {
    name: 'Potatoes 1kg',
    brand: 'GreenCart',
    unit: 'kg',
    mrp: '35.00',
    selling: '28.00',
    qty: 80,
    categoryId: 'cat-2',
  },
  {
    name: 'Basmati Rice 5kg',
    brand: 'GrainGold',
    unit: 'bag',
    mrp: '520.00',
    selling: '449.00',
    qty: 18,
    categoryId: 'cat-1',
  },
  {
    name: 'Toor Dal 1kg',
    brand: 'GrainGold',
    unit: 'kg',
    mrp: '180.00',
    selling: '159.00',
    qty: 22,
    categoryId: 'cat-1',
  },
  {
    name: 'Sunflower Oil 1L',
    brand: 'CookWell',
    unit: 'ltr',
    mrp: '160.00',
    selling: '139.00',
    qty: 20,
    categoryId: 'cat-1',
  },
  {
    name: 'Wheat Atta 5kg',
    brand: 'GrainGold',
    unit: 'bag',
    mrp: '280.00',
    selling: '249.00',
    qty: 15,
    categoryId: 'cat-1',
  },
  {
    name: 'Sugar 1kg',
    brand: 'SweetLeaf',
    unit: 'kg',
    mrp: '50.00',
    selling: '44.00',
    qty: 40,
    categoryId: 'cat-1',
  },
  {
    name: 'Iodized Salt 1kg',
    brand: 'PureSalt',
    unit: 'kg',
    mrp: '25.00',
    selling: '20.00',
    qty: 55,
    categoryId: 'cat-1',
  },
  {
    name: 'Turmeric Powder 200g',
    brand: 'SpiceBox',
    unit: 'pc',
    mrp: '85.00',
    selling: '72.00',
    qty: 28,
    categoryId: 'cat-1',
  },
  {
    name: 'Red Chilli Powder 200g',
    brand: 'SpiceBox',
    unit: 'pc',
    mrp: '90.00',
    selling: '75.00',
    qty: 26,
    categoryId: 'cat-1',
  },
  {
    name: 'Garam Masala 100g',
    brand: 'SpiceBox',
    unit: 'pc',
    mrp: '95.00',
    selling: '82.00',
    qty: 24,
    categoryId: 'cat-1',
  },
  {
    name: 'Paneer 200g',
    brand: 'FarmFresh',
    unit: 'pc',
    mrp: '110.00',
    selling: '95.00',
    qty: 16,
    categoryId: 'cat-3',
  },
  {
    name: 'Curd 400g',
    brand: 'FarmFresh',
    unit: 'pc',
    mrp: '45.00',
    selling: '38.00',
    qty: 32,
    categoryId: 'cat-3',
  },
  {
    name: 'Butter 100g',
    brand: 'FarmFresh',
    unit: 'pc',
    mrp: '62.00',
    selling: '55.00',
    qty: 20,
    categoryId: 'cat-3',
  },
  {
    name: 'Cheddar Cheese 200g',
    brand: 'DairyDale',
    unit: 'pc',
    mrp: '190.00',
    selling: '169.00',
    qty: 12,
    categoryId: 'cat-3',
  },
  {
    name: 'Chicken Curry Cut 1kg',
    brand: 'FreshCuts',
    unit: 'kg',
    mrp: '280.00',
    selling: '249.00',
    qty: 10,
    categoryId: 'cat-1',
  },
  {
    name: 'Rohu Fish 500g',
    brand: 'OceanCatch',
    unit: 'pc',
    mrp: '220.00',
    selling: '199.00',
    qty: 8,
    categoryId: 'cat-1',
  },
  {
    name: 'Frozen Peas 500g',
    brand: 'FrostBite',
    unit: 'pc',
    mrp: '90.00',
    selling: '75.00',
    qty: 30,
    categoryId: 'cat-2',
  },
  {
    name: 'Maggi Noodles Pack of 8',
    brand: 'Maggi',
    unit: 'pack',
    mrp: '120.00',
    selling: '108.00',
    qty: 40,
    categoryId: 'cat-1',
  },
  {
    name: 'Cornflakes 475g',
    brand: 'Kellogg',
    unit: 'pc',
    mrp: '210.00',
    selling: '189.00',
    qty: 18,
    categoryId: 'cat-1',
  },
  {
    name: 'Instant Coffee 50g',
    brand: 'Nescafe',
    unit: 'pc',
    mrp: '165.00',
    selling: '149.00',
    qty: 22,
    categoryId: 'cat-5',
  },
  {
    name: 'Tea Leaves 250g',
    brand: 'TataTea',
    unit: 'pc',
    mrp: '145.00',
    selling: '129.00',
    qty: 25,
    categoryId: 'cat-5',
  },
  {
    name: 'Orange Juice 1L',
    brand: 'TropiFresh',
    unit: 'ltr',
    mrp: '130.00',
    selling: '110.00',
    qty: 20,
    categoryId: 'cat-5',
  },
  {
    name: 'Mineral Water 1L',
    brand: 'AquaPure',
    unit: 'ltr',
    mrp: '20.00',
    selling: '18.00',
    qty: 80,
    categoryId: 'cat-5',
  },
  {
    name: 'Cola 750ml',
    brand: 'FizzPop',
    unit: 'pc',
    mrp: '40.00',
    selling: '36.00',
    qty: 45,
    categoryId: 'cat-5',
  },
  {
    name: 'Potato Chips 90g',
    brand: 'CrunchTime',
    unit: 'pc',
    mrp: '40.00',
    selling: '35.00',
    qty: 50,
    categoryId: 'cat-4',
  },
  {
    name: 'Digestive Biscuits 250g',
    brand: 'BakeHouse',
    unit: 'pc',
    mrp: '55.00',
    selling: '48.00',
    qty: 35,
    categoryId: 'cat-4',
  },
  {
    name: 'Dark Chocolate 80g',
    brand: 'CocoaBar',
    unit: 'pc',
    mrp: '99.00',
    selling: '85.00',
    qty: 20,
    categoryId: 'cat-4',
  },
  {
    name: 'Handwash 250ml',
    brand: 'CleanCare',
    unit: 'pc',
    mrp: '75.00',
    selling: '65.00',
    qty: 28,
    categoryId: 'cat-10',
  },
  {
    name: 'Dishwash Gel 750ml',
    brand: 'CleanCare',
    unit: 'pc',
    mrp: '110.00',
    selling: '95.00',
    qty: 22,
    categoryId: 'cat-10',
  },
  {
    name: 'Toilet Cleaner 500ml',
    brand: 'CleanCare',
    unit: 'pc',
    mrp: '95.00',
    selling: '82.00',
    qty: 18,
    categoryId: 'cat-10',
  },
  {
    name: 'Toothpaste 150g',
    brand: 'BrightSmile',
    unit: 'pc',
    mrp: '85.00',
    selling: '72.00',
    qty: 30,
    categoryId: 'cat-7',
  },
  {
    name: 'Shampoo 180ml',
    brand: 'SilkHair',
    unit: 'pc',
    mrp: '140.00',
    selling: '125.00',
    qty: 16,
    categoryId: 'cat-7',
  },
  {
    name: 'Bath Soap 125g',
    brand: 'CleanCare',
    unit: 'pc',
    mrp: '45.00',
    selling: '38.00',
    qty: 40,
    categoryId: 'cat-7',
  },
  {
    name: 'Detergent Powder 1kg',
    brand: 'WashPro',
    unit: 'kg',
    mrp: '160.00',
    selling: '139.00',
    qty: 24,
    categoryId: 'cat-10',
  },
];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function uuid(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-0000000000${pad2(n)}`;
}

export const DUMMY_CATALOG: DummySellerProduct[] = ITEMS.map((item, index) => {
  const n = index + 1;
  const id = uuid('aaaaaaa0', n);
  const masterId = uuid('bbbbbbb0', n);
  return {
    id,
    sellerType: SellerType.STORE,
    storeId: DUMMY_STORE_ID,
    independentSellerId: null,
    masterProductId: masterId,
    variantId: null,
    title: `${item.name} - Fresh Mart`,
    mrp: item.mrp,
    sellingPrice: item.selling,
    isActive: true,
    masterProduct: {
      id: masterId,
      categoryId: item.categoryId,
      name: item.name,
      description: `Dummy catalog item: ${item.name}`,
      brand: item.brand,
      baseUnit: item.unit,
      attributes: {},
    },
    store: { id: DUMMY_STORE_ID, name: 'Fresh Mart' },
    independentSeller: null,
    inventory: {
      quantityAvailable: item.qty,
      quantityReserved: 0,
    },
  };
});

function matchesFilters(
  product: DummySellerProduct,
  filters: { categoryId?: string; storeId?: string; q?: string },
): boolean {
  if (
    filters.categoryId &&
    product.masterProduct.categoryId !== filters.categoryId
  ) {
    return false;
  }
  if (filters.storeId && product.storeId !== filters.storeId) {
    return false;
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const haystack =
      `${product.title} ${product.masterProduct.name} ${product.masterProduct.brand}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function filterDummyCatalog(filters: {
  categoryId?: string;
  storeId?: string;
  q?: string;
}): DummySellerProduct[] {
  return DUMMY_CATALOG.filter((p) => matchesFilters(p, filters));
}

export function paginateDummyCatalog(
  page: number,
  limit: number,
  filters: { categoryId?: string; storeId?: string; q?: string },
): PaginatedResult<DummySellerProduct> {
  const filtered = filterDummyCatalog(filters);
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  };
}

export function findDummyProductById(
  id: string,
): DummySellerProduct | undefined {
  return DUMMY_CATALOG.find((p) => p.id === id);
}

export function listDummyByStoreId(storeId: string): DummySellerProduct[] {
  const forStore = DUMMY_CATALOG.filter((p) => p.storeId === storeId);
  return forStore.length > 0 ? forStore : DUMMY_CATALOG;
}
