/** Customer + delivery details collected at checkout (Pakistan). */
export interface CheckoutCustomerDetails {
  fullName: string;
  mobile: string;
  email: string;
  province: string;
  city: string;
  area: string;
  address: string;
  postalCode: string;
  notes?: string;
}

export type CheckoutFieldErrors = Partial<
  Record<keyof CheckoutCustomerDetails, string>
>;
