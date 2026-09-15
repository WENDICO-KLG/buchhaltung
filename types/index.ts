export type ApplicationStatus =
  | "saved"
  | "preparing"
  | "applied"
  | "interview"
  | "final_interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ApplicationCategory =
  | "software"
  | "sales"
  | "business"
  | "finance"
  | "banking"
  | "consulting"
  | "other";

export type CVType = "developer" | "sales" | "finance" | "other";

export interface Application {
  id: string;
  company: string;
  position: string;
  location?: string;
  jobUrl?: string;
  source?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  deadline?: string;
  category: ApplicationCategory;
  status: ApplicationStatus;
  matchScore?: number;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
  cvType?: CVType;
  jobDescription?: string;
  notes?: string;
}

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: "created" | "applied" | "interview" | "final_interview" | "note";
  label: string;
  date: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedIn?: string;
}

export interface CV {
  id: string;
  name: string;
  type: CVType;
  description: string;
  updatedAt: string;
  status: "Ready" | "Draft";
  fileName?: string;
  storagePath?: string;
  fileType?: string;
  fileSize?: number;
}