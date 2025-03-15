
export type JointArea = 
  | "ankle_foot"
  | "leg"
  | "knee"
  | "hip"
  | "spine"
  | "shoulder"
  | "elbow_hand";

export type Condition =
  | "plantar_fasciitis"
  | "calcaneal_spur"
  | "ankle_sprain"
  | "anterior_compartment"
  | "shin_splints"
  | "achilles_tendinitis"
  | "patellofemoral"
  | "patellar_tendinitis"
  | "acl_postop"
  | "mcl_injury"
  | "meniscus_injury"
  | "knee_arthrosis"
  | "trochanteric_bursitis"
  | "piriformis_syndrome"
  | "sports_hernia"
  | "it_band_syndrome"
  | "disc_protrusion"
  | "herniated_disc"
  | "cervical_lordosis"
  | "frozen_shoulder"
  | "shoulder_bursitis"
  | "rotator_cuff"
  | "impingement"
  | "medial_epicondylitis"
  | "lateral_epicondylitis"
  | "carpal_tunnel";

export type RehabGoal = "pain_relief" | "mobility" | "strength" | "return_to_sport";

export interface FisioPreferences {
  age: number;
  weight: number;
  height: number;
  gender: "male" | "female";
  joint_area: JointArea;
  condition: Condition;
  pain_level: number;
  mobility_level: "limited" | "moderate" | "good";
  previous_treatment: boolean;
  activity_level: "sedentary" | "light" | "moderate" | "active";
  
  // Additional fields for API
  painLocation?: string;
  injuryDescription?: string;
  injuryDuration?: string;
  previousTreatments?: string;
  exerciseExperience?: string;
  equipmentAvailable?: string[];
}
