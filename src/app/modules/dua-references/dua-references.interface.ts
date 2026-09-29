export interface ICreateDuaReferenceInput {
  sourceId: string;
  referenceText: string;
  verseOrHadithNumber?: string;
}

export interface IUpdateDuaReferenceInput {
  sourceId?: string;
  referenceText?: string;
  verseOrHadithNumber?: string;
}
