import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const vendorCompanyTypeValues = [
  'manufacturer',
  'trading',
  'agent',
  'distributor',
  'other',
] as const;

export const vendorAnnualRevenueValues = [
  'under_1m',
  '1m_5m',
  '5m_10m',
  '10m_50m',
  '50m_100m',
  'over_100m',
] as const;

export const vendorEmployeeCountValues = [
  '1_10',
  '11_50',
  '51_200',
  '201_500',
  '501_1000',
  'over_1000',
] as const;

export const vendorFactorySizeValues = [
  'under_1000',
  '1000_5000',
  '5000_10000',
  '10000_50000',
  'over_50000',
] as const;

export const vendorResponseTimeValues = ['24h', '12h', '6h', '2h', '1h'] as const;

export const socialPlatformValues = [
  'linkedin',
  'facebook',
  'twitter',
  'instagram',
  'youtube',
  'other',
] as const;

const marketRow = z.object({ market: z.string() });
const productRow = z.object({ product: z.string() });
const certRow = z.object({ certification: z.string() });
const paymentRow = z.object({ term: z.string() });
const socialRow = z.object({
  platform: z.enum(socialPlatformValues),
  url: z.string(),
});
const keyPersonRow = z.object({
  name: z.string(),
  title: z.string().optional(),
});

/** Supplier-editable profile (no account email; mirrors follow user name via hooks). */
export const vendorSelfServiceProfileSchema = z.object({
  name: z.string().min(1).max(120),
  companyName: z.string().min(1).max(200),
  companyType: z.enum(vendorCompanyTypeValues).optional().nullable(),
  yearEstablished: z.number().int().min(1900).max(currentYear).optional(),
  annualRevenue: z.enum(vendorAnnualRevenueValues).optional().nullable(),
  employeeCount: z.enum(vendorEmployeeCountValues).optional().nullable(),
  mainMarkets: z.array(marketRow).optional(),
  mainProducts: z.array(productRow).optional(),
  factoryLocation: z.string().max(500).optional(),
  factorySize: z.enum(vendorFactorySizeValues).optional().nullable(),
  productionCapacity: z.string().max(2000).optional(),
  qualityCertifications: z.array(certRow).optional(),
  tradeAssurance: z.boolean().optional(),
  responseTime: z.enum(vendorResponseTimeValues).optional().nullable(),
  acceptSampleOrders: z.boolean().optional(),
  acceptCustomOrders: z.boolean().optional(),
  paymentTerms: z.array(paymentRow).optional(),
  businessRegistrationNumber: z.string().max(200).optional(),
  taxId: z.string().max(200).optional(),
  companyWebsite: z.string().max(500).optional(),
  socialMediaLinks: z.array(socialRow).optional(),
  companyVideo: z.string().max(500).optional(),
  keyPersonnel: z.array(keyPersonRow).optional(),
  companyHistory: z.string().max(10000).optional(),
  productionLinesCount: z.number().int().min(0).optional(),
  qualityControlProcess: z.string().max(10000).optional(),
  rndCapability: z.string().max(10000).optional(),
  warehouseInformation: z.string().max(10000).optional(),
  shippingCapabilities: z.string().max(10000).optional(),
});

export type VendorSelfServiceProfileInput = z.infer<typeof vendorSelfServiceProfileSchema>;

function filterMarketRows(rows: { market: string }[] | undefined) {
  if (!rows?.length) return [];
  return rows.map((r) => ({ market: r.market.trim() })).filter((r) => r.market.length > 0);
}

function filterProductRows(rows: { product: string }[] | undefined) {
  if (!rows?.length) return [];
  return rows.map((r) => ({ product: r.product.trim() })).filter((r) => r.product.length > 0);
}

function filterCertRows(rows: { certification: string }[] | undefined) {
  if (!rows?.length) return [];
  return rows
    .map((r) => ({ certification: r.certification.trim() }))
    .filter((r) => r.certification.length > 0);
}

function filterPaymentRows(rows: { term: string }[] | undefined) {
  if (!rows?.length) return [];
  return rows.map((r) => ({ term: r.term.trim() })).filter((r) => r.term.length > 0);
}

function filterSocialRows(
  rows: { platform: (typeof socialPlatformValues)[number]; url: string }[] | undefined,
) {
  if (!rows?.length) return [];
  return rows
    .map((r) => ({ platform: r.platform, url: r.url.trim() }))
    .filter((r) => r.url.length > 0);
}

function filterKeyPersonnel(
  rows: { name: string; title?: string }[] | undefined,
) {
  if (!rows?.length) return [];
  return rows
    .map((r) => ({
      name: r.name.trim(),
      title: r.title?.trim() || undefined,
    }))
    .filter((r) => r.name.length > 0);
}

/** Full supplier-editable snapshot for Payload `vendors` update (clears optional fields when emptied). */
export function buildVendorSelfServicePatch(
  input: VendorSelfServiceProfileInput,
): Record<string, unknown> {
  return {
    companyName: input.companyName,
    companyType: input.companyType ?? null,
    yearEstablished: input.yearEstablished ?? null,
    annualRevenue: input.annualRevenue ?? null,
    employeeCount: input.employeeCount ?? null,
    mainMarkets: filterMarketRows(input.mainMarkets),
    mainProducts: filterProductRows(input.mainProducts),
    factoryLocation: input.factoryLocation?.trim() ?? '',
    factorySize: input.factorySize ?? null,
    productionCapacity: input.productionCapacity?.trim() ?? '',
    qualityCertifications: filterCertRows(input.qualityCertifications),
    tradeAssurance: input.tradeAssurance ?? false,
    responseTime: input.responseTime ?? null,
    acceptSampleOrders: input.acceptSampleOrders ?? true,
    acceptCustomOrders: input.acceptCustomOrders ?? true,
    paymentTerms: filterPaymentRows(input.paymentTerms),
    businessRegistrationNumber: input.businessRegistrationNumber?.trim() ?? '',
    taxId: input.taxId?.trim() ?? '',
    companyWebsite: input.companyWebsite?.trim() ?? '',
    socialMediaLinks: filterSocialRows(input.socialMediaLinks),
    companyVideo: input.companyVideo?.trim() ?? '',
    keyPersonnel: filterKeyPersonnel(input.keyPersonnel),
    companyHistory: input.companyHistory?.trim() ?? '',
    productionLinesCount: input.productionLinesCount ?? null,
    qualityControlProcess: input.qualityControlProcess?.trim() ?? '',
    rndCapability: input.rndCapability?.trim() ?? '',
    warehouseInformation: input.warehouseInformation?.trim() ?? '',
    shippingCapabilities: input.shippingCapabilities?.trim() ?? '',
  };
}
