
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
