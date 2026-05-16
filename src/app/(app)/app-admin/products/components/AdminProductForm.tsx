"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import {
  adminProductCreateInputSchema,
  type AdminProductFormValues,
  normalizeProductImageIds,
} from "@/lib/admin-product-form-schema";
import { validatedOnToInputValue } from "@/lib/product-validated-on";
import { productImageMediaIds } from "@/lib/media-url";
import type { Product } from "@/payload-types";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

function firstResolvedFormError(
  errors: FieldErrors<AdminProductFormValues> | Record<string, unknown>,
): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const v of Object.values(errors)) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    if (typeof r.message === "string" && r.message.trim() !== "") {
      return r.message;
    }
    const nested = firstResolvedFormError(v as Record<string, unknown>);
    if (nested) return nested;
  }
  return undefined;
}

const emptyDefaults: AdminProductFormValues = {
  title: "",
  supplier: "",
  description: "",
  category: "",
  actualSupplierUrl: "",
  unitPrice: null,
  moq: null,
  bulkPricingTiers: [],
  sampleAvailable: false,
  samplePrice: null,
  customizationAvailable: false,
  leadTime: "",
  packagingOptions: [],
  shippingTerms: [],
  paymentTerms: [],
  productCertifications: [],
  hsCode: "",
  originCountry: "",
  images: [],
  validatedOn: "",
};

function productImageIdsFromProduct(p: Product): string[] {
  return normalizeProductImageIds(productImageMediaIds(p.images ?? [])) ?? [];
}

function productToFormValues(p: Product): AdminProductFormValues {
  const supplierId =
    typeof p.supplier === "string" ? p.supplier : p.supplier.id;
  return {
    title: p.title,
    supplier: supplierId,
    description: p.description ?? "",
    category: p.category ?? "",
    actualSupplierUrl: p.actualSupplierUrl ?? "",
    unitPrice: p.unitPrice ?? null,
    moq: p.moq ?? null,
    bulkPricingTiers: (p.bulkPricingTiers ?? []).map((t) => ({
      minQuantity: t.minQuantity,
      price: t.price,
      unit: t.unit ?? "",
    })),
    sampleAvailable: p.sampleAvailable ?? false,
    samplePrice: p.samplePrice ?? null,
    customizationAvailable: p.customizationAvailable ?? false,
    leadTime: p.leadTime ?? "",
    packagingOptions: (p.packagingOptions ?? []).map((x) => ({
      option: x.option,
    })),
    shippingTerms: (p.shippingTerms ?? []).map((x) => ({ term: x.term })),
    paymentTerms: (p.paymentTerms ?? []).map((x) => ({ term: x.term })),
    productCertifications: (p.productCertifications ?? []).map((x) => ({
      certification: x.certification,
    })),
    hsCode: p.hsCode ?? "",
    originCountry: p.originCountry ?? "",
    images: productImageIdsFromProduct(p),
    validatedOn: validatedOnToInputValue(p.validatedOn),
  };
}

type AdminProductFormProps =
  | { mode: "create" }
  | { mode: "edit"; productId: string };

export function AdminProductForm(props: AdminProductFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: vendorsData } = trpc.admin.vendors.list.useQuery({
    page: 1,
    limit: 100,
    sort: "companyName",
  });

  const productQuery = trpc.admin.products.getById.useQuery(
    { id: props.mode === "edit" ? props.productId : "" },
    { enabled: props.mode === "edit" }
  );

  const form = useForm<AdminProductFormValues>({
    // zod defaults (e.g. validatedOn "") widen resolver input/output vs RHF generics in zod v4 + @hookform/resolvers.
    resolver: zodResolver(adminProductCreateInputSchema) as any,
    defaultValues: emptyDefaults,
  });

  const tierArray = useFieldArray({
    control: form.control,
    name: "bulkPricingTiers",
  });

  const packArray = useFieldArray({
    control: form.control,
    name: "packagingOptions",
  });

  const shipArray = useFieldArray({
    control: form.control,
    name: "shippingTerms",
  });

  const payArray = useFieldArray({
    control: form.control,
    name: "paymentTerms",
  });

  const certArray = useFieldArray({
    control: form.control,
    name: "productCertifications",
  });

  useEffect(() => {
    if (props.mode !== "edit" || !productQuery.data) return;
    form.reset(productToFormValues(productQuery.data as Product));
  }, [props.mode, productQuery.data, form]);

  const createMutation = trpc.admin.products.create.useMutation({
    onSuccess: (res) => {
      toast.success("Product created");
      void utils.admin.products.list.invalidate();
      router.push(`/app-admin/products/${res.product.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateFullMutation = trpc.admin.products.updateFull.useMutation({
    onSuccess: () => {
      toast.success("Product saved");
      void utils.admin.products.list.invalidate();
      if (props.mode === "edit") {
        void utils.admin.products.getById.invalidate({ id: props.productId });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: AdminProductFormValues) => {
    if (props.mode === "create") {
      createMutation.mutate(values);
    } else {
      updateFullMutation.mutate({ id: props.productId, ...values });
    }
  };

  const isBusy =
    createMutation.isPending ||
    updateFullMutation.isPending ||
    (props.mode === "edit" && productQuery.isLoading);

  if (props.mode === "edit" && productQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        Product not found or failed to load.
      </div>
    );
  }

  if (props.mode === "edit" && productQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading product…
      </div>
    );
  }

  const loadedTitle =
    props.mode === "edit" && productQuery.data
      ? (productQuery.data as Product).title
      : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app-admin/products">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to products
          </Link>
        </Button>
        {props.mode === "edit" ? (
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-600"
            onClick={() => setDeleteOpen(true)}
          >
            Delete product
          </Button>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {props.mode === "create" ? "New product" : "Edit product"}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          All catalog fields for this listing. Save to persist.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (errors) =>
            toast.error(
              firstResolvedFormError(errors) ??
                "Unable to save — please fix highlighted fields.",
            ),
          )}
          className="space-y-8"
        >
          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Basics</h2>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose vendor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendorsData?.vendors?.map(
                        (v: { id: string; companyName?: string }) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.companyName || v.id}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : parseFloat(v));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="moq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MOQ</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? null : parseInt(v, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Bulk pricing tiers</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    tierArray.append({ minQuantity: 0, price: 0, unit: "" })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add tier
                </Button>
              </div>
              <div className="space-y-2">
                {tierArray.fields.map((row, i) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-end gap-2 border rounded-md p-3"
                  >
                    <FormField
                      control={form.control}
                      name={`bulkPricingTiers.${i}.minQuantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[100px]">
                          <FormLabel className="text-xs">Min qty</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`bulkPricingTiers.${i}.price`}
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[100px]">
                          <FormLabel className="text-xs">Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`bulkPricingTiers.${i}.unit`}
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[80px]">
                          <FormLabel className="text-xs">Unit</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => tierArray.remove(i)}
                      aria-label="Remove tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Links & admin
            </h2>
            <FormField
              control={form.control}
              name="actualSupplierUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual supplier URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="validatedOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validated on</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Clear the date in the picker to unset (save to apply).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Samples & customization
            </h2>
            <FormField
              control={form.control}
              name="sampleAvailable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Sample available</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="samplePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sample price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : parseFloat(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customizationAvailable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Customization / OEM</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leadTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead time</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Packaging, shipping, payment, certifications
            </h2>
            {(
              [
                ["packagingOptions", packArray, "option"] as const,
                ["shippingTerms", shipArray, "term"] as const,
                ["paymentTerms", payArray, "term"] as const,
                ["productCertifications", certArray, "certification"] as const,
              ] as const
            ).map(([name, arr, key]) => (
              <div key={name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="capitalize">
                    {name.replace(/([A-Z])/g, " $1").trim()}
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => arr.append({ [key]: "" } as never)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {arr.fields.map((row, i) => (
                  <div key={row.id} className="flex gap-2 items-center">
                    <FormField
                      control={form.control}
                      name={`${name}.${i}.${key}` as never}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => arr.remove(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Trade</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hsCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HS code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin country</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">Images</h2>
            <p className="text-xs text-gray-600">
              Multiple images supported. Order is preserved: the first image is the
              main photo on the public product page; the rest appear as thumbnails.
            </p>
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ImageUpload
                      value={field.value ?? []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <Button type="submit" disabled={isBusy} size="lg">
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : props.mode === "create" ? (
              "Create product"
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </Form>

      {props.mode === "edit" ? (
        <ProductDeleteDialog
          productId={props.productId}
          productTitle={loadedTitle || "Product"}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onSuccess={() => router.push("/app-admin/products")}
        />
      ) : null}
    </div>
  );
}
