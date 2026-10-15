import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  User,
  AdminUser,
  AuthProvider,
  AuthToken,
  Address,
  Category,
  Country,
  Division,
  District,
  Attribute,
  AttributeValue,
  Product,
  ProductMedia,
  ProductSKU,
  ProductSKUVariant,
  Collection,
  Wishlist,
  Review,
  Cart,
  CartItem,
  Coupon,
  CouponHistoryLog,
  Order,
  OrderItem,
  OrderStatusHistory,
  OrderAddress,
  OrderReturn,
  OrderReturnItem,
  OrderReturnStatusHistory,
  Payment,
  PaymentGateway,
  ShippingZone,
  Banner,
  HomepageSection,
  PageSettings,
  SystemSetting,
  Language,
} from './entities';

/**
 * One repository per entity as a plain property, so services can use
 * `this.database.product.find(...)` without each module re-declaring
 * TypeOrmModule.forFeature.
 */
@Injectable()
export class DatabaseService implements OnApplicationBootstrap {
  user: Repository<User>;
  adminUser: Repository<AdminUser>;
  authProvider: Repository<AuthProvider>;
  authToken: Repository<AuthToken>;
  address: Repository<Address>;
  category: Repository<Category>;
  country: Repository<Country>;
  division: Repository<Division>;
  district: Repository<District>;
  attribute: Repository<Attribute>;
  attributeValue: Repository<AttributeValue>;
  product: Repository<Product>;
  productMedia: Repository<ProductMedia>;
  productSKU: Repository<ProductSKU>;
  productSKUVariant: Repository<ProductSKUVariant>;
  collection: Repository<Collection>;
  wishlist: Repository<Wishlist>;
  review: Repository<Review>;
  cart: Repository<Cart>;
  cartItem: Repository<CartItem>;
  coupon: Repository<Coupon>;
  couponHistoryLog: Repository<CouponHistoryLog>;
  order: Repository<Order>;
  orderItem: Repository<OrderItem>;
  orderStatusHistory: Repository<OrderStatusHistory>;
  orderAddress: Repository<OrderAddress>;
  orderReturn: Repository<OrderReturn>;
  orderReturnItem: Repository<OrderReturnItem>;
  orderReturnStatusHistory: Repository<OrderReturnStatusHistory>;
  payment: Repository<Payment>;
  paymentGateway: Repository<PaymentGateway>;
  shippingZone: Repository<ShippingZone>;
  banner: Repository<Banner>;
  homepageSection: Repository<HomepageSection>;
  pageSettings: Repository<PageSettings>;
  systemSetting: Repository<SystemSetting>;
  language: Repository<Language>;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
    @InjectRepository(AuthProvider)
    private readonly authProviderRepository: Repository<AuthProvider>,
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(Division)
    private readonly divisionRepository: Repository<Division>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly attributeValueRepository: Repository<AttributeValue>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    @InjectRepository(ProductSKU)
    private readonly productSKURepository: Repository<ProductSKU>,
    @InjectRepository(ProductSKUVariant)
    private readonly productSKUVariantRepository: Repository<ProductSKUVariant>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(CouponHistoryLog)
    private readonly couponHistoryLogRepository: Repository<CouponHistoryLog>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly orderStatusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(OrderAddress)
    private readonly orderAddressRepository: Repository<OrderAddress>,
    @InjectRepository(OrderReturn)
    private readonly orderReturnRepository: Repository<OrderReturn>,
    @InjectRepository(OrderReturnItem)
    private readonly orderReturnItemRepository: Repository<OrderReturnItem>,
    @InjectRepository(OrderReturnStatusHistory)
    private readonly orderReturnStatusHistoryRepository: Repository<OrderReturnStatusHistory>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentGateway)
    private readonly paymentGatewayRepository: Repository<PaymentGateway>,
    @InjectRepository(ShippingZone)
    private readonly shippingZoneRepository: Repository<ShippingZone>,
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(HomepageSection)
    private readonly homepageSectionRepository: Repository<HomepageSection>,
    @InjectRepository(PageSettings)
    private readonly pageSettingsRepository: Repository<PageSettings>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  onApplicationBootstrap() {
    this.user = this.userRepository;
    this.adminUser = this.adminUserRepository;
    this.authProvider = this.authProviderRepository;
    this.authToken = this.authTokenRepository;
    this.address = this.addressRepository;
    this.category = this.categoryRepository;
    this.country = this.countryRepository;
    this.division = this.divisionRepository;
    this.district = this.districtRepository;
    this.attribute = this.attributeRepository;
    this.attributeValue = this.attributeValueRepository;
    this.product = this.productRepository;
    this.productMedia = this.productMediaRepository;
    this.productSKU = this.productSKURepository;
    this.productSKUVariant = this.productSKUVariantRepository;
    this.collection = this.collectionRepository;
    this.wishlist = this.wishlistRepository;
    this.review = this.reviewRepository;
    this.cart = this.cartRepository;
    this.cartItem = this.cartItemRepository;
    this.coupon = this.couponRepository;
    this.couponHistoryLog = this.couponHistoryLogRepository;
    this.order = this.orderRepository;
    this.orderItem = this.orderItemRepository;
    this.orderStatusHistory = this.orderStatusHistoryRepository;
    this.orderAddress = this.orderAddressRepository;
    this.orderReturn = this.orderReturnRepository;
    this.orderReturnItem = this.orderReturnItemRepository;
    this.orderReturnStatusHistory = this.orderReturnStatusHistoryRepository;
    this.payment = this.paymentRepository;
    this.paymentGateway = this.paymentGatewayRepository;
    this.shippingZone = this.shippingZoneRepository;
    this.banner = this.bannerRepository;
    this.homepageSection = this.homepageSectionRepository;
    this.pageSettings = this.pageSettingsRepository;
    this.systemSetting = this.systemSettingRepository;
    this.language = this.languageRepository;
  }

  /**
   * Escape hatch for writes that must be atomic (order placement writes an
   * order, items, address, payment, coupon usage and history in one go).
   */
  transaction<T>(run: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(run);
  }
}
