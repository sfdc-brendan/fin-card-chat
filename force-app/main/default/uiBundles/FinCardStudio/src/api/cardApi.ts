import { createDataSDK } from '@salesforce/sdk-data';
import { executeGraphQL } from './graphqlClient';
import {
  CREATE_CARD,
  DELETE_CARD,
  GET_CARD,
  LIST_CARDS,
  LIST_PRODUCTS,
  UPDATE_CARD,
} from './cardQueries';
import type {
  CreateFinCardMutation,
  CreateFinCardMutationVariables,
  DeleteFinCardMutation,
  DeleteFinCardMutationVariables,
  GetFinCardQuery,
  GetFinCardQueryVariables,
  ListFinCardsQuery,
  ListStudioProductsQuery,
  UpdateFinCardMutation,
  UpdateFinCardMutationVariables,
} from './graphql-operations-types';
import {
  fromRecord,
  parseDisplaySettings,
  parseGenerated,
  toRecordInput,
  trustedSiteName,
  type CardDraft,
  type DisplaySettings,
  type GenerateRequest,
  type GeneratedCard,
  type StudioProduct,
  type V1Card,
} from '@/lib/cardModel';

export interface CardMatch {
  card: V1Card;
  hits: number;
  reasons: string[];
}

export interface MatchRequest {
  userText: string;
  finText: string;
  sourceUrls: string[];
  maxCards: number;
}

export async function listCards(): Promise<CardDraft[]> {
  const data = await executeGraphQL<ListFinCardsQuery, Record<string, never>>(
    LIST_CARDS
  );
  return (data.uiapi.query.Fin_UI_Card__c?.edges ?? [])
    .map(edge => edge?.node)
    .filter(node => node != null)
    .map(fromRecord);
}

export async function getCard(id: string): Promise<CardDraft | null> {
  const data = await executeGraphQL<GetFinCardQuery, GetFinCardQueryVariables>(
    GET_CARD,
    { id }
  );
  const node = data.uiapi.query.Fin_UI_Card__c?.edges?.[0]?.node;
  return node ? fromRecord(node) : null;
}

export async function saveCard(draft: CardDraft): Promise<string> {
  const fields = toRecordInput(draft);
  if (draft.id) {
    const data = await executeGraphQL<
      UpdateFinCardMutation,
      UpdateFinCardMutationVariables
    >(UPDATE_CARD, {
      input: { Id: draft.id, Fin_UI_Card__c: fields },
    });
    return data.uiapi.Fin_UI_Card__cUpdate?.Record?.Id ?? draft.id;
  }
  const data = await executeGraphQL<
    CreateFinCardMutation,
    CreateFinCardMutationVariables
  >(CREATE_CARD, {
    input: { Fin_UI_Card__c: fields },
  });
  const id = data.uiapi.Fin_UI_Card__cCreate?.Record?.Id;
  if (!id) throw new Error('Salesforce did not return the new card ID.');
  return id;
}

export async function deleteCard(id: string): Promise<void> {
  await executeGraphQL<DeleteFinCardMutation, DeleteFinCardMutationVariables>(
    DELETE_CARD,
    { id }
  );
}

export async function listProducts(): Promise<StudioProduct[]> {
  const data = await executeGraphQL<
    ListStudioProductsQuery,
    Record<string, never>
  >(LIST_PRODUCTS);
  const nodes = (data.uiapi.query.Product2?.edges ?? [])
    .map(edge => edge?.node)
    .filter(node => node != null);
  return nodes.map(node => ({
    id: node.Id,
    name: node.Name?.value ?? '',
    code: node.ProductCode?.value ?? '',
    family: node.Family?.displayValue ?? node.Family?.value ?? '',
    description: node.Description?.value ?? '',
    imageUrl: node.Image_URL__c?.value ?? '',
    unitPrice:
      node.PricebookEntries?.edges?.[0]?.node?.UnitPrice?.value ?? null,
  }));
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

async function postStudio(
  action: 'match' | 'seed' | 'generate' | 'settings' | 'imagehosts',
  body: object
): Promise<Record<string, unknown>> {
  const sdk = await createDataSDK();
  const response = await sdk.fetch?.(`/services/apexrest/fincards/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response) throw new Error('Salesforce is not reachable from this page.');
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !isObject(payload)) {
    const message =
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : `Fin Card Studio request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

function isCardMatch(value: unknown): value is CardMatch {
  return (
    isObject(value) &&
    isObject(value.card) &&
    typeof value.card.title === 'string' &&
    typeof value.hits === 'number' &&
    Array.isArray(value.reasons)
  );
}

export async function matchCards(request: MatchRequest): Promise<CardMatch[]> {
  const result = await postStudio('match', request);
  return Array.isArray(result.matches)
    ? result.matches.filter(isCardMatch)
    : [];
}

export async function generateCard(
  request: GenerateRequest
): Promise<GeneratedCard> {
  const generated = parseGenerated(await postStudio('generate', request));
  if (!generated)
    throw new Error(
      'The model returned something that is not a card. Try rephrasing the brief.'
    );
  return generated;
}

export async function seedCards(): Promise<number> {
  const result = await postStudio('seed', {});
  return typeof result.created === 'number' ? result.created : 0;
}

async function displaySettings(
  body: Partial<DisplaySettings>
): Promise<DisplaySettings> {
  const settings = parseDisplaySettings(await postStudio('settings', body));
  if (!settings)
    throw new Error(
      'Salesforce returned display settings this version of the studio does not understand.'
    );
  return settings;
}

export async function getDisplaySettings(): Promise<DisplaySettings> {
  return displaySettings({});
}

export async function saveDisplaySettings(
  settings: DisplaySettings
): Promise<DisplaySettings> {
  return displaySettings(settings);
}

/** Active CSP Trusted URLs that allow images. Browsers block card images from any other host. */
export async function listImageHosts(): Promise<string[]> {
  const result = await postStudio('imagehosts', {});
  return Array.isArray(result.hosts)
    ? result.hosts.filter((host): host is string => typeof host === 'string')
    : [];
}

/**
 * Adds an images-only CSP Trusted URL for host so card images from it load in the studio and on every
 * Experience site. Apex can't insert CspTrustedSite, so this goes through the UI API as the signed-in
 * user, who needs permission to manage Trusted URLs.
 */
export async function trustImageHost(host: string): Promise<void> {
  const sdk = await createDataSDK();
  const response = await sdk.fetch?.('/services/data/v67.0/ui-api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiName: 'CspTrustedSite',
      fields: {
        DeveloperName: trustedSiteName(host),
        MasterLabel: host.slice(0, 80),
        EndpointUrl: `https://${host}`,
        Description: 'Card images added in Fin Card Studio',
        Context: 'All',
        IsActive: true,
        IsApplicableToImgSrc: true,
        IsApplicableToConnectSrc: false,
        IsApplicableToFontSrc: false,
        IsApplicableToFrameSrc: false,
        IsApplicableToMediaSrc: false,
        IsApplicableToStyleSrc: false,
      },
    }),
  });
  if (!response) throw new Error('Salesforce is not reachable from this page.');
  if (response.ok) return;
  const message =
    uiApiError(await response.json().catch(() => null)) ??
    `HTTP ${response.status}`;
  if (/already defined/i.test(message)) return;
  throw new Error(message);
}

function uiApiError(payload: unknown): string | null {
  const first: unknown = Array.isArray(payload) ? payload[0] : payload;
  if (!isObject(first)) return null;
  if (typeof first.message === 'string') return first.message;
  const output = isObject(first.output) ? first.output : null;
  const errors: unknown[] = Array.isArray(output?.errors) ? output.errors : [];
  const fieldErrors: unknown[] = isObject(output?.fieldErrors)
    ? Object.values(output.fieldErrors).flat()
    : [];
  const detail = [...errors, ...fieldErrors].find(
    (error): error is { message: string } =>
      isObject(error) && typeof error.message === 'string'
  );
  return detail?.message ?? null;
}
