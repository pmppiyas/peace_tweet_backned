export interface ICreateCategoryInput {
  nameBangla: string;
  nameEnglish?: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface IUpdateCategoryInput {
  nameBangla?: string;
  nameEnglish?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}
