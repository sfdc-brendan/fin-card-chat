export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Base64: { input: string; output: string; }
  Currency: { input: number | string; output: number; }
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Double: { input: number | string; output: number; }
  Email: { input: string; output: string; }
  EncryptedString: { input: string; output: string; }
  /** Can be set to an ID or a Reference to the result of another mutation operation. */
  IdOrRef: { input: string; output: string; }
  JSON: { input: string; output: string; }
  Latitude: { input: number | string; output: number; }
  /** A 64-bit signed integer */
  Long: { input: number; output: number; }
  LongTextArea: { input: string; output: string; }
  Longitude: { input: number | string; output: number; }
  MultiPicklist: { input: string; output: string; }
  Percent: { input: number | string; output: number; }
  PhoneNumber: { input: string; output: string; }
  Picklist: { input: string; output: string; }
  RichTextArea: { input: string; output: string; }
  TextArea: { input: string; output: string; }
  Time: { input: string; output: string; }
  Url: { input: string; output: string; }
};

export enum DataType {
  Address = 'ADDRESS',
  Anytype = 'ANYTYPE',
  Base64 = 'BASE64',
  Boolean = 'BOOLEAN',
  Combobox = 'COMBOBOX',
  Complexvalue = 'COMPLEXVALUE',
  Currency = 'CURRENCY',
  Date = 'DATE',
  Datetime = 'DATETIME',
  Double = 'DOUBLE',
  Email = 'EMAIL',
  Encryptedstring = 'ENCRYPTEDSTRING',
  Int = 'INT',
  Json = 'JSON',
  Junctionidlist = 'JUNCTIONIDLIST',
  Location = 'LOCATION',
  Long = 'LONG',
  Multipicklist = 'MULTIPICKLIST',
  Percent = 'PERCENT',
  Phone = 'PHONE',
  Picklist = 'PICKLIST',
  Reference = 'REFERENCE',
  String = 'STRING',
  Textarea = 'TEXTAREA',
  Time = 'TIME',
  Url = 'URL'
}

export enum FieldExtraTypeInfo {
  ExternalLookup = 'EXTERNAL_LOOKUP',
  ImageUrl = 'IMAGE_URL',
  IndirectLookup = 'INDIRECT_LOOKUP',
  Personname = 'PERSONNAME',
  Plaintextarea = 'PLAINTEXTAREA',
  Richtextarea = 'RICHTEXTAREA',
  SwitchablePersonname = 'SWITCHABLE_PERSONNAME'
}

export type Fin_Ui_Card__CCreateInput = {
  Fin_UI_Card__c: Fin_Ui_Card__CCreateRepresentation;
};

export type Fin_Ui_Card__CCreateRepresentation = {
  Active__c?: InputMaybe<Scalars['Boolean']['input']>;
  Badge__c?: InputMaybe<Scalars['String']['input']>;
  Body__c?: InputMaybe<Scalars['LongTextArea']['input']>;
  Card_Size__c?: InputMaybe<Scalars['Picklist']['input']>;
  CreatedById?: InputMaybe<Scalars['IdOrRef']['input']>;
  CreatedDate?: InputMaybe<Scalars['DateTime']['input']>;
  CurrencyIsoCode?: InputMaybe<Scalars['Picklist']['input']>;
  Image_URL__c?: InputMaybe<Scalars['Url']['input']>;
  LastModifiedById?: InputMaybe<Scalars['IdOrRef']['input']>;
  LastModifiedDate?: InputMaybe<Scalars['DateTime']['input']>;
  Match_On__c?: InputMaybe<Scalars['Picklist']['input']>;
  Name?: InputMaybe<Scalars['String']['input']>;
  OwnerId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Price_Label__c?: InputMaybe<Scalars['String']['input']>;
  Primary_Action_Label__c?: InputMaybe<Scalars['String']['input']>;
  Primary_Action_Type__c?: InputMaybe<Scalars['Picklist']['input']>;
  Primary_Action_Value__c?: InputMaybe<Scalars['String']['input']>;
  Priority__c?: InputMaybe<Scalars['Double']['input']>;
  Product__c?: InputMaybe<Scalars['IdOrRef']['input']>;
  Secondary_Action_Label__c?: InputMaybe<Scalars['String']['input']>;
  Secondary_Action_Type__c?: InputMaybe<Scalars['Picklist']['input']>;
  Secondary_Action_Value__c?: InputMaybe<Scalars['String']['input']>;
  Source_URL_Contains__c?: InputMaybe<Scalars['String']['input']>;
  Subtitle__c?: InputMaybe<Scalars['String']['input']>;
  Title__c?: InputMaybe<Scalars['String']['input']>;
  Trigger_Keywords__c?: InputMaybe<Scalars['LongTextArea']['input']>;
  Type__c?: InputMaybe<Scalars['Picklist']['input']>;
};

export type Fin_Ui_Card__CUpdateInput = {
  Fin_UI_Card__c: Fin_Ui_Card__CUpdateRepresentation;
  Id: Scalars['IdOrRef']['input'];
};

export type Fin_Ui_Card__CUpdateRepresentation = {
  Active__c?: InputMaybe<Scalars['Boolean']['input']>;
  Badge__c?: InputMaybe<Scalars['String']['input']>;
  Body__c?: InputMaybe<Scalars['LongTextArea']['input']>;
  Card_Size__c?: InputMaybe<Scalars['Picklist']['input']>;
  CurrencyIsoCode?: InputMaybe<Scalars['Picklist']['input']>;
  Image_URL__c?: InputMaybe<Scalars['Url']['input']>;
  Match_On__c?: InputMaybe<Scalars['Picklist']['input']>;
  Name?: InputMaybe<Scalars['String']['input']>;
  OwnerId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Price_Label__c?: InputMaybe<Scalars['String']['input']>;
  Primary_Action_Label__c?: InputMaybe<Scalars['String']['input']>;
  Primary_Action_Type__c?: InputMaybe<Scalars['Picklist']['input']>;
  Primary_Action_Value__c?: InputMaybe<Scalars['String']['input']>;
  Priority__c?: InputMaybe<Scalars['Double']['input']>;
  Product__c?: InputMaybe<Scalars['IdOrRef']['input']>;
  Secondary_Action_Label__c?: InputMaybe<Scalars['String']['input']>;
  Secondary_Action_Type__c?: InputMaybe<Scalars['Picklist']['input']>;
  Secondary_Action_Value__c?: InputMaybe<Scalars['String']['input']>;
  Source_URL_Contains__c?: InputMaybe<Scalars['String']['input']>;
  Subtitle__c?: InputMaybe<Scalars['String']['input']>;
  Title__c?: InputMaybe<Scalars['String']['input']>;
  Trigger_Keywords__c?: InputMaybe<Scalars['LongTextArea']['input']>;
  Type__c?: InputMaybe<Scalars['Picklist']['input']>;
};

export enum FormFactor {
  Large = 'LARGE',
  Medium = 'MEDIUM',
  Small = 'SMALL'
}

export enum LayoutComponentType {
  Canvas = 'CANVAS',
  CustomLink = 'CUSTOM_LINK',
  EmptySpace = 'EMPTY_SPACE',
  Field = 'FIELD',
  ReportChart = 'REPORT_CHART',
  VisualforcePage = 'VISUALFORCE_PAGE'
}

export enum LayoutMode {
  Create = 'CREATE',
  Edit = 'EDIT',
  View = 'VIEW'
}

export enum LayoutType {
  Compact = 'COMPACT',
  Full = 'FULL'
}

export enum ResultOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum TabOrder {
  LeftRight = 'LEFT_RIGHT',
  TopDown = 'TOP_DOWN'
}

export enum UiBehavior {
  Edit = 'EDIT',
  Readonly = 'READONLY',
  Required = 'REQUIRED'
}

export type ListFinCardsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListFinCardsQuery = { uiapi: { query: { Fin_UI_Card__c?: { edges?: Array<{ node?: { Id: string, Name?: { value?: string | null } | null, Type__c?: { value?: string | null } | null, Title__c?: { value?: string | null } | null, Subtitle__c?: { value?: string | null } | null, Body__c?: { value?: string | null } | null, Image_URL__c?: { value?: string | null } | null, Product__c?: { value?: string | null } | null, Product__r?: { Name?: { value?: string | null } | null } | null, Price_Label__c?: { value?: string | null } | null, Badge__c?: { value?: string | null } | null, Primary_Action_Type__c?: { value?: string | null } | null, Primary_Action_Label__c?: { value?: string | null } | null, Primary_Action_Value__c?: { value?: string | null } | null, Secondary_Action_Type__c?: { value?: string | null } | null, Secondary_Action_Label__c?: { value?: string | null } | null, Secondary_Action_Value__c?: { value?: string | null } | null, Trigger_Keywords__c?: { value?: string | null } | null, Match_On__c?: { value?: string | null } | null, Source_URL_Contains__c?: { value?: string | null } | null, Priority__c?: { value?: number | null } | null, Card_Size__c?: { value?: string | null } | null, Active__c?: { value?: boolean | null } | null, LastModifiedDate?: { value?: string | null, displayValue?: string | null } | null } | null } | null> | null } | null } } };

export type GetFinCardQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFinCardQuery = { uiapi: { query: { Fin_UI_Card__c?: { edges?: Array<{ node?: { Id: string, Name?: { value?: string | null } | null, Type__c?: { value?: string | null } | null, Title__c?: { value?: string | null } | null, Subtitle__c?: { value?: string | null } | null, Body__c?: { value?: string | null } | null, Image_URL__c?: { value?: string | null } | null, Product__c?: { value?: string | null } | null, Product__r?: { Name?: { value?: string | null } | null } | null, Price_Label__c?: { value?: string | null } | null, Badge__c?: { value?: string | null } | null, Primary_Action_Type__c?: { value?: string | null } | null, Primary_Action_Label__c?: { value?: string | null } | null, Primary_Action_Value__c?: { value?: string | null } | null, Secondary_Action_Type__c?: { value?: string | null } | null, Secondary_Action_Label__c?: { value?: string | null } | null, Secondary_Action_Value__c?: { value?: string | null } | null, Trigger_Keywords__c?: { value?: string | null } | null, Match_On__c?: { value?: string | null } | null, Source_URL_Contains__c?: { value?: string | null } | null, Priority__c?: { value?: number | null } | null, Card_Size__c?: { value?: string | null } | null, Active__c?: { value?: boolean | null } | null, LastModifiedDate?: { value?: string | null, displayValue?: string | null } | null } | null } | null> | null } | null } } };

export type ListStudioProductsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListStudioProductsQuery = { uiapi: { query: { Product2?: { edges?: Array<{ node?: { Id: string, Name?: { value?: string | null } | null, ProductCode?: { value?: string | null } | null, Family?: { value?: string | null, displayValue?: string | null } | null, Description?: { value?: string | null } | null, Image_URL__c?: { value?: string | null } | null, PricebookEntries?: { edges?: Array<{ node?: { UnitPrice?: { value?: number | null } | null } | null } | null> | null } | null } | null } | null> | null } | null } } };

export type CreateFinCardMutationVariables = Exact<{
  input: Fin_Ui_Card__CCreateInput;
}>;


export type CreateFinCardMutation = { uiapi: { Fin_UI_Card__cCreate?: { Record?: { Id: string } | null } | null } };

export type UpdateFinCardMutationVariables = Exact<{
  input: Fin_Ui_Card__CUpdateInput;
}>;


export type UpdateFinCardMutation = { uiapi: { Fin_UI_Card__cUpdate?: { Record?: { Id: string } | null } | null } };

export type DeleteFinCardMutationVariables = Exact<{
  id: Scalars['IdOrRef']['input'];
}>;


export type DeleteFinCardMutation = { uiapi: { Fin_UI_Card__cDelete?: { Id?: string | null } | null } };
