import {
  ActionEnum,
  BlocEnum,
  DocumentTypeEnum,
  LegalTextTypeEnum,
  StatusEnum,
} from "./enum";

export type Chat = {
  id: string;
  createdAt: string;
  updatedAt: string;
  question: string;
  answer: string;
  documentTypes: DocumentTypeEnum[];
  legalSubjects: LegalTextTypeEnum[];
  discussionId: string;
  evaluationId: string | null;
};

export type Source = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  titleNumber?: string;
  chapter?: string;
  chapterNumber?: string;
  section?: string;
  sectionNumber?: string;
  legalTextName: string;
  legalTextType: LegalTextTypeEnum;
  bloc: BlocEnum;
  status: StatusEnum;
  articleNumber: string;
  pathDoc: string;
  action: ActionEnum;
  book?: string;
  pathMetadata: string;
  chatId: string;
  reference: string;
  page: number;
};

export type Discussion = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  userId: string;
};

export type Evaluation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  note: string;
  comment: string;
  chatId: string;
};

export type ChatResponse = {
  count: number;
  limit: number;
  page: number;
  data: Chat[];
};

export type SourceResponse = {
  count: number;
  limit: number;
  page: number;
  data: Source[];
};

export type DiscussionResponse = {
  count: number;
  limit: number;
  page: number;
  data: Discussion[];
};

export type EValuationResponse = {
  id: string;
  createdAt: string;
  updatedAt: string;
  note: string;
  comment: string;
  chatId: string;
};

export type DiscussionValue = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  userId: string;
};
