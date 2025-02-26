
export interface MentalModule {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface MentalVideo {
  id: string;
  title: string;
  description: string | null;
  url: string;
  module_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  mental_modules?: Partial<MentalModule>;
}
