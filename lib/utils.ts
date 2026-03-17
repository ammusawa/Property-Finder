export function formatPrice(price: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export const NIGERIAN_CITIES: Record<string, string[]> = {
  'Lagos': ['Lagos Island', 'Lagos Mainland', 'Ikeja', 'Victoria Island', 'Lekki', 'Surulere', 'Yaba', 'Gbagada', 'Ikoyi', 'Ajah'],
  'FCT': ['Abuja', 'Gwarinpa', 'Maitama', 'Wuse', 'Asokoro', 'Garki', 'Kubwa', 'Nyanya'],
  'Kano': ['Kano', 'Fagge', 'Nassarawa', 'Tarauni'],
  'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Eleme', 'Ikwerre'],
  'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Saki'],
  'Enugu': ['Enugu', 'Nsukka', 'Oji River'],
  'Abia': ['Aba', 'Umuahia'],
  'Delta': ['Asaba', 'Warri', 'Ughelli'],
  'Kaduna': ['Kaduna', 'Zaria'],
  'Ogun': ['Abeokuta', 'Sagamu'],
};

export const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
];

export const LISTING_TYPES = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rent', label: 'For Rent' },
  { value: 'lease', label: 'For Lease' },
];
