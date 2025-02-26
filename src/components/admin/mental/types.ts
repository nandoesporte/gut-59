
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

export interface MentalResource {
  id: string;
  title: string;
  description?: string;
  content?: string;
  resource_type: 'emergency_contact' | 'educational_content' | 'useful_link';
  display_order: number;
  status: string;
  phone_number?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

export type NewMentalResource = Omit<MentalResource, 'id' | 'created_at' | 'updated_at' | 'status' | 'display_order'>;
