import type { CollectionConfig } from 'payload';

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['buyer', 'supplier', 'orderType', 'status', 'totalAmount', 'createdAt'],
    description: 'B2B orders',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      // Buyers can see their orders, vendors can see orders for their products
      if ((req.user as any).role === 'buyer') {
        return { buyer: { equals: req.user.id } };
      }
      if ((req.user as any).role === 'vendor') {
        // Need to check if order's supplier matches vendor's vendor profile
        return true; // Will be filtered by tRPC/API
      }
      return false;
    },
    create: ({ req }) => {
      // Only buyers can create orders
      return (req.user as any)?.role === 'buyer';
    },
    update: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'admin') return true;
      // Buyers and vendors can update orders (different fields)
      if ((req.user as any).role === 'buyer') {
        return { buyer: { equals: req.user.id } };
      }
      return false;
    },
    delete: ({ req }) => {
      // Only admins can delete orders
      return (req.user as any)?.role === 'admin';
    },
  },
  fields: [
    {
      name: 'buyer',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Buyer who placed this order',
      },
    },
    {
      name: 'supplier',
      type: 'relationship',
      relationTo: 'vendors',
      required: true,
      admin: {
        description: 'Vendor/supplier fulfilling this order',
      },
    },
    {
      name: 'orderType',
      type: 'select',
      options: [
        { label: 'Standard Order', value: 'standard' },
        { label: 'Sample Order', value: 'sample' },
        { label: 'Custom Order', value: 'custom' },
      ],
      defaultValue: 'standard',
      admin: {
        description: 'Type of order',
      },
    },
    {
      name: 'products',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          min: 1,
          required: true,
        },
        {
          name: 'unitPrice',
          type: 'number',
          min: 0,
          required: true,
        },
        {
          name: 'totalPrice',
          type: 'number',
          min: 0,
          required: true,
        },
      ],
      admin: {
        description: 'Products in this order',
      },
    },
    {
      name: 'totalAmount',
      type: 'number',
      min: 0,
      required: true,
      admin: {
        description: 'Total order amount',
      },
    },
    {
      name: 'paymentTerms',
      type: 'array',
      fields: [
        {
          name: 'term',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Payment terms',
      },
    },
    {
      name: 'paymentSchedule',
      type: 'array',
      fields: [
        {
          name: 'amount',
          type: 'number',
          min: 0,
          required: true,
        },
        {
          name: 'dueDate',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Paid', value: 'paid' },
            { label: 'Overdue', value: 'overdue' },
          ],
          defaultValue: 'pending',
        },
      ],
      admin: {
        description: 'Payment schedule',
      },
    },
    {
      name: 'depositAmount',
      type: 'number',
      min: 0,
      admin: {
        description: 'Deposit amount required',
      },
    },
    {
      name: 'depositPaid',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether deposit has been paid',
      },
    },
    {
      name: 'tradeAssurance',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Order protected by trade assurance',
      },
    },
    {
      name: 'escrowAmount',
      type: 'number',
      min: 0,
      admin: {
        description: 'Amount held in escrow',
      },
    },
    {
      name: 'shippingTerms',
      type: 'array',
      fields: [
        {
          name: 'term',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Shipping terms (FOB, CIF, etc.)',
      },
    },
    {
      name: 'deliveryDate',
      type: 'date',
      admin: {
        description: 'Expected delivery date',
      },
    },
    {
      name: 'inspectionDate',
      type: 'date',
      admin: {
        description: 'Product inspection date',
      },
    },
    {
      name: 'invoiceNumber',
      type: 'text',
      admin: {
        description: 'Invoice number',
      },
    },
    {
      name: 'poNumber',
      type: 'text',
      admin: {
        description: 'Purchase order number',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'In Production', value: 'in_production' },
        { label: 'Quality Check', value: 'quality_check' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Disputed', value: 'disputed' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Order status',
      },
    },
    {
      name: 'phoneNumber',
      type: 'text',
      required: true,
      admin: {
        description: 'Customer phone number for order contact',
      },
    },
    {
      name: 'shippingAddress',
      type: 'group',
      fields: [
        {
          name: 'fullName',
          type: 'text',
          required: true,
        },
        {
          name: 'street',
          type: 'text',
          required: true,
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'state',
          type: 'text',
          required: true,
        },
        {
          name: 'zipcode',
          type: 'text',
          required: true,
        },
        {
          name: 'country',
          type: 'text',
          defaultValue: 'United States',
        },
      ],
      admin: {
        description: 'Shipping address for this order',
      },
    },
  ],
  timestamps: true,
};
