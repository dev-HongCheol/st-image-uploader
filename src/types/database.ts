// Database table types

export interface FolderCounter {
  id: string;
  user_id: string;
  folder_index: number;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  folder_path: string;
  folder_index: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  has_thumbnail: boolean;
  thumbnail_path?: string;
  thumbnail_size?: number;
  upload_status: "uploading" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Insert types (without auto-generated fields)
export interface FolderCounterInsert {
  user_id: string;
  folder_index: number;
  file_count?: number;
}

export interface UploadedFileInsert {
  user_id: string;
  folder_path: string;
  folder_index: number;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  has_thumbnail?: boolean;
  thumbnail_path?: string;
  thumbnail_size?: number;
  upload_status?: "uploading" | "completed" | "failed";
  error_message?: string;
}

// Update types (all fields optional except id)
export interface FolderCounterUpdate {
  file_count?: number;
  updated_at?: string;
}

export interface UploadedFileUpdate {
  has_thumbnail?: boolean;
  thumbnail_path?: string;
  thumbnail_size?: number;
  upload_status?: "uploading" | "completed" | "failed";
  error_message?: string;
  updated_at?: string;
}

// Response types for API
export interface UploadResult {
  success: boolean;
  fileName: string;
  filePath?: string;
  fileUrl?: string;
  error?: string;
}

export interface UploadResponse {
  results: UploadResult[];
}
