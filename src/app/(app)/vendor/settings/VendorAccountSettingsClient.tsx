'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  vendorSelfServiceProfileSchema,
  type VendorSelfServiceProfileInput,
  vendorCompanyTypeValues,
  vendorAnnualRevenueValues,
  vendorEmployeeCountValues,
  vendorFactorySizeValues,
  vendorResponseTimeValues,
  socialPlatformValues,
} from '@/lib/vendor-self-service-profile';

const COMPANY_TYPE_LABEL: Record<(typeof vendorCompanyTypeValues)[number], string> = {
  manufacturer: 'Manufacturer',
  trading: 'Trading company',
  agent: 'Agent',
  distributor: 'Distributor',
  other: 'Other',
};

const RESPONSE_TIME_LABEL: Record<(typeof vendorResponseTimeValues)[number], string> = {
  '24h': 'Within 24 hours',
  '12h': 'Within 12 hours',
  '6h': 'Within 6 hours',
  '2h': 'Within 2 hours',
  '1h': 'Within 1 hour',
};

function vendorToFormDefaults(
  vendor: unknown,
  sessionName: string | null | undefined,
): VendorSelfServiceProfileInput {
  const v = (vendor ?? {}) as Record<string, unknown>;
  const mk = (v.mainMarkets as { market?: string }[] | undefined) ?? [];
  const mp = (v.mainProducts as { product?: string }[] | undefined) ?? [];
  const qc = (v.qualityCertifications as { certification?: string }[] | undefined) ?? [];
  const pt = (v.paymentTerms as { term?: string }[] | undefined) ?? [];
  const sm = (v.socialMediaLinks as { platform?: string; url?: string }[] | undefined) ?? [];
  const kp = (v.keyPersonnel as { name?: string; title?: string }[] | undefined) ?? [];

  return {
    name: ((v.accountName as string | undefined) ?? sessionName ?? '').trim(),
    companyName: (v.companyName as string | undefined) ?? '',
    companyType: (v.companyType as VendorSelfServiceProfileInput['companyType']) ?? null,
    yearEstablished:
      typeof v.yearEstablished === 'number' && !Number.isNaN(v.yearEstablished)
        ? v.yearEstablished
        : undefined,
    annualRevenue: (v.annualRevenue as VendorSelfServiceProfileInput['annualRevenue']) ?? null,
    employeeCount: (v.employeeCount as VendorSelfServiceProfileInput['employeeCount']) ?? null,
    mainMarkets: mk.length ? mk.map((x) => ({ market: x.market ?? '' })) : [{ market: '' }],
    mainProducts: mp.length ? mp.map((x) => ({ product: x.product ?? '' })) : [{ product: '' }],
    factoryLocation: (v.factoryLocation as string | undefined) ?? '',
    factorySize: (v.factorySize as VendorSelfServiceProfileInput['factorySize']) ?? null,
    productionCapacity: (v.productionCapacity as string | undefined) ?? '',
    qualityCertifications: qc.length
      ? qc.map((x) => ({ certification: x.certification ?? '' }))
      : [{ certification: '' }],
    tradeAssurance: Boolean(v.tradeAssurance),
    responseTime: (v.responseTime as VendorSelfServiceProfileInput['responseTime']) ?? null,
    acceptSampleOrders: v.acceptSampleOrders !== false,
    acceptCustomOrders: v.acceptCustomOrders !== false,
    paymentTerms: pt.length ? pt.map((x) => ({ term: x.term ?? '' })) : [{ term: '' }],
    businessRegistrationNumber: (v.businessRegistrationNumber as string | undefined) ?? '',
    taxId: (v.taxId as string | undefined) ?? '',
    companyWebsite: (v.companyWebsite as string | undefined) ?? '',
    socialMediaLinks: sm.length
      ? sm.map((x) => ({
          platform: (socialPlatformValues as readonly string[]).includes(x.platform ?? '')
            ? (x.platform as (typeof socialPlatformValues)[number])
            : 'other',
          url: x.url ?? '',
        }))
      : [{ platform: 'other', url: '' }],
    companyVideo: (v.companyVideo as string | undefined) ?? '',
    keyPersonnel: kp.length
      ? kp.map((x) => ({ name: x.name ?? '', title: x.title ?? '' }))
      : [{ name: '', title: '' }],
    companyHistory: (v.companyHistory as string | undefined) ?? '',
    productionLinesCount:
      typeof v.productionLinesCount === 'number' && !Number.isNaN(v.productionLinesCount)
        ? v.productionLinesCount
        : undefined,
    qualityControlProcess: (v.qualityControlProcess as string | undefined) ?? '',
    rndCapability: (v.rndCapability as string | undefined) ?? '',
    warehouseInformation: (v.warehouseInformation as string | undefined) ?? '',
    shippingCapabilities: (v.shippingCapabilities as string | undefined) ?? '',
  };
}

function OptionalSelect<T extends string>({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  placeholder?: string;
  options: { value: T; label: string }[];
}) {
  const v = value ?? '__none__';
  return (
    <Select
      value={v}
      onValueChange={(nv) => onChange(nv === '__none__' ? null : (nv as T))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Not set</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function VendorAccountSettingsClient() {
  const utils = trpc.useUtils();
  const { data: session } = trpc.auth.session.useQuery();
  const userId = session?.user?.id;

  const { data: vendor, isLoading } = trpc.vendors.getByUser.useQuery(
    { userId: userId ?? '' },
    { enabled: !!userId },
  );

  const form = useForm<VendorSelfServiceProfileInput>({
    resolver: zodResolver(vendorSelfServiceProfileSchema),
    defaultValues: vendorToFormDefaults(null, session?.user?.name),
  });

  const markets = useFieldArray({ control: form.control, name: 'mainMarkets' });
  const products = useFieldArray({ control: form.control, name: 'mainProducts' });
  const certs = useFieldArray({ control: form.control, name: 'qualityCertifications' });
  const terms = useFieldArray({ control: form.control, name: 'paymentTerms' });
  const socials = useFieldArray({ control: form.control, name: 'socialMediaLinks' });
  const personnel = useFieldArray({ control: form.control, name: 'keyPersonnel' });

  useEffect(() => {
    if (!vendor) return;
    form.reset(vendorToFormDefaults(vendor, session?.user?.name));
  }, [vendor, session?.user?.name, form]);

  const mutation = trpc.vendors.updateAccountSettings.useMutation({
    onSuccess: () => {
      toast.success('Profile saved');
      void utils.vendors.getByUser.invalidate();
      void utils.auth.session.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Could not save');
    },
  });

  const onSubmit = (values: VendorSelfServiceProfileInput) => {
    mutation.mutate(values);
  };

  if (!userId || isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <p className="text-sm text-gray-600">
        Could not load your supplier profile. Try refreshing the page.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Company & contact</CardTitle>
            <CardDescription>Legal name and your display name (sign-in email is not editable here).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="organization" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company type</FormLabel>
                  <FormControl>
                    <OptionalSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={vendorCompanyTypeValues.map((value) => ({
                        value,
                        label: COMPANY_TYPE_LABEL[value],
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearEstablished"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year established</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={field.value === undefined || field.value === null ? '' : field.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="annualRevenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual revenue</FormLabel>
                  <FormControl>
                    <OptionalSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={vendorAnnualRevenueValues.map((value) => ({
                        value,
                        label: value
                          .replace('under_1m', 'Under $1M')
                          .replace('1m_5m', '$1M – $5M')
                          .replace('5m_10m', '$5M – $10M')
                          .replace('10m_50m', '$10M – $50M')
                          .replace('50m_100m', '$50M – $100M')
                          .replace('over_100m', 'Over $100M'),
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employees</FormLabel>
                  <FormControl>
                    <OptionalSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={vendorEmployeeCountValues.map((value) => ({
                        value,
                        label: value
                          .replace('1_10', '1–10')
                          .replace('11_50', '11–50')
                          .replace('51_200', '51–200')
                          .replace('201_500', '201–500')
                          .replace('501_1000', '501–1000')
                          .replace('over_1000', 'Over 1000'),
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responseTime"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Typical inquiry response time</FormLabel>
                  <FormControl>
                    <OptionalSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={vendorResponseTimeValues.map((value) => ({
                        value,
                        label: RESPONSE_TIME_LABEL[value],
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2 flex flex-wrap gap-6">
              <FormField
                control={form.control}
                name="tradeAssurance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Trade assurance</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptSampleOrders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Accept sample orders</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="acceptCustomOrders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Accept custom / OEM orders</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Markets & products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <FormLabel>Main markets</FormLabel>
              {markets.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`mainMarkets.${i}.market`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="e.g. North America" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove row"
                    onClick={() => markets.remove(i)}
                    disabled={markets.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => markets.append({ market: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add market
              </Button>
            </div>
            <div className="space-y-2">
              <FormLabel>Main product categories</FormLabel>
              {products.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`mainProducts.${i}.product`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Category" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove row"
                    onClick={() => products.remove(i)}
                    disabled={products.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => products.append({ product: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add category
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factory & production</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="factoryLocation"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Factory location</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="factorySize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factory size</FormLabel>
                  <FormControl>
                    <OptionalSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={vendorFactorySizeValues.map((value) => ({
                        value,
                        label: value
                          .replace('under_1000', 'Under 1,000 sqm')
                          .replace('1000_5000', '1,000 – 5,000 sqm')
                          .replace('5000_10000', '5,000 – 10,000 sqm')
                          .replace('10000_50000', '10,000 – 50,000 sqm')
                          .replace('over_50000', 'Over 50,000 sqm'),
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productionLinesCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production lines</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value === undefined || field.value === null ? '' : field.value}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productionCapacity"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Production capacity</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. units per month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance & commercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <FormLabel>Quality certifications</FormLabel>
              {certs.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`qualityCertifications.${i}.certification`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="e.g. ISO 9001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove row"
                    onClick={() => certs.remove(i)}
                    disabled={certs.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => certs.append({ certification: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add certification
              </Button>
            </div>
            <div className="space-y-2">
              <FormLabel>Payment terms</FormLabel>
              {terms.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`paymentTerms.${i}.term`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="e.g. T/T, L/C" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remove row"
                    onClick={() => terms.remove(i)}
                    disabled={terms.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => terms.append({ term: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add term
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="businessRegistrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business registration</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Online presence</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyWebsite"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyVideo"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Company video URL</FormLabel>
                  <FormControl>
                    <Input placeholder="YouTube, Vimeo, …" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2 space-y-2">
              <FormLabel>Social links</FormLabel>
              {socials.fields.map((f, i) => (
                <div key={f.id} className="flex flex-col sm:flex-row gap-2">
                  <FormField
                    control={form.control}
                    name={`socialMediaLinks.${i}.platform`}
                    render={({ field }) => (
                      <FormItem className="sm:w-48">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {socialPlatformValues.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`socialMediaLinks.${i}.url`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    aria-label="Remove row"
                    onClick={() => socials.remove(i)}
                    disabled={socials.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => socials.append({ platform: 'other', url: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add social link
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personnel.fields.map((f, i) => (
              <div key={f.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <FormField
                  control={form.control}
                  name={`keyPersonnel.${i}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`keyPersonnel.${i}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mb-0.5"
                  aria-label="Remove row"
                  onClick={() => personnel.remove(i)}
                  disabled={personnel.fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => personnel.append({ name: '', title: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add person
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About & operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="companyHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company history</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualityControlProcess"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quality control</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rndCapability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>R&D</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="warehouseInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shippingCapabilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping & logistics</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 left-0 right-0 flex justify-end border-t bg-background/95 py-4 backdrop-blur">
          <Button type="submit" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save profile'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
