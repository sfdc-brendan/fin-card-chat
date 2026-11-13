import { describe, expect, it } from 'vitest';
import {
  applyProduct,
  carouselIds,
  clampMaxCards,
  draftContent,
  emptyDraft,
  imageHost,
  linkAction,
  mergeGenerated,
  modelLabel,
  parseDisplaySettings,
  parseGenerated,
  parseKeywords,
  toRecordInput,
  toV1,
  trustedSiteName,
  trustsImageHost,
  validateDraft,
  type CardDraft,
  type StudioProduct,
} from './cardModel';

const orbit: StudioProduct = {
  id: '01t000000000001',
  name: 'Orbit 7',
  code: 'NG-ORBIT-7',
  family: 'Home networking',
  description: 'Wi-Fi 7 mesh for every room. Ships in a 2-pack.',
  imageUrl: '',
  unitPrice: 229,
};

const fiber: StudioProduct = {
  ...orbit,
  id: '01t000000000002',
  name: 'Acme Fiber 2',
  description: 'More room for everything you love.',
  unitPrice: 95,
};

function draft(overrides: Partial<CardDraft> = {}): CardDraft {
  return {
    ...emptyDraft('Product'),
    title: 'Orbit 7',
    keywords: ['mesh'],
    ...overrides,
  };
}

describe('toV1', () => {
  it('splits body lines into text and bullets like FinCardMatcher.toCard', () => {
    const card = toV1(
      draft({ body: 'Intro line\n- First\n• Second\n\nOutro' })
    );
    expect(card.text).toBe('Intro line\nOutro');
    expect(card.bullets).toEqual(['First', 'Second']);
    expect(card.type).toBe('product');
  });

  it('drops unsafe image URLs and actions the chat would refuse', () => {
    const card = toV1(
      draft({
        imageUrl: 'http://insecure.example.com/a.jpg',
        primary: {
          type: 'Open_URL',
          label: 'Go',
          value: 'javascript:alert(1)',
        },
        secondary: {
          type: 'Launch_Flow',
          label: 'Start',
          value: 'not a flow name',
        },
      })
    );
    expect(card.imageUrl).toBeNull();
    expect(card.actions).toEqual([]);
  });

  it('sends the label when a Send_Message action has no message', () => {
    const card = toV1(
      draft({
        primary: {
          type: 'Send_Message',
          label: 'Is it right for me?',
          value: ' ',
        },
      })
    );
    expect(card.actions).toEqual([
      {
        role: 'primary',
        kind: 'send_message',
        label: 'Is it right for me?',
        value: 'Is it right for me?',
      },
    ]);
  });
});

describe('applyProduct', () => {
  it('fills blank fields from the product', () => {
    const next = applyProduct(emptyDraft('Product'), orbit, null);
    expect(next).toMatchObject({
      productId: orbit.id,
      title: 'Orbit 7',
      subtitle: 'Wi-Fi 7 mesh for every room.',
      imageUrl: '',
      priceLabel: '$229',
      sourceUrlContains: 'product-orbit-7',
      keywords: ['orbit 7'],
    });
  });

  it('replaces the previous product defaults but keeps text the author wrote', () => {
    const linked = applyProduct(emptyDraft('Product'), orbit, null);
    const edited = {
      ...linked,
      subtitle: 'Hand-written subtitle',
      keywords: [...linked.keywords, 'dead zone'],
    };
    const switched = applyProduct(edited, fiber, orbit);
    expect(switched.title).toBe('Acme Fiber 2');
    expect(switched.priceLabel).toBe('$95');
    expect(switched.sourceUrlContains).toBe('product-acme-fiber-2');
    expect(switched.subtitle).toBe('Hand-written subtitle');
    expect(switched.keywords).toEqual(['dead zone', 'acme fiber 2']);
  });
});

describe('validateDraft', () => {
  it('requires a title and a way to match', () => {
    const errors = validateDraft(emptyDraft());
    expect(errors.title).toBeDefined();
    expect(errors.keywords).toBeDefined();
    expect(
      validateDraft(
        draft({ keywords: [], sourceUrlContains: 'product-orbit-7' })
      ).keywords
    ).toBeUndefined();
  });

  it('checks each configured action', () => {
    const errors = validateDraft(
      draft({
        primary: { type: 'Open_URL', label: 'View', value: 'ftp://x' },
        secondary: {
          type: 'Launch_Flow',
          label: '',
          value: 'Fin_Request_Callback',
        },
      })
    );
    expect(errors.primary).toMatch(/https/);
    expect(errors.secondary).toMatch(/label/);
  });
});

describe('toRecordInput', () => {
  it('clears blank fields and unused action values', () => {
    const input = toRecordInput(
      draft({
        subtitle: '  ',
        primary: {
          type: null,
          label: 'Leftover',
          value: 'https://x.example.com',
        },
      })
    );
    expect(input.Subtitle__c).toBeNull();
    expect(input.Primary_Action_Type__c).toBeNull();
    expect(input.Primary_Action_Label__c).toBeNull();
    expect(input.Trigger_Keywords__c).toBe('mesh');
    expect(input.Name).toBe('Orbit 7 product card');
  });

  it('saves the card size as its picklist label, or blank to follow the Display setting', () => {
    expect(toRecordInput(draft({ size: 'compact' })).Card_Size__c).toBe(
      'Compact'
    );
    expect(toRecordInput(draft({ size: null })).Card_Size__c).toBeNull();
    expect(toV1(draft({ size: 'compact' })).size).toBe('compact');
  });
});

describe('parseKeywords', () => {
  it('splits on newlines, commas, and semicolons and dedupes case-insensitively', () => {
    expect(parseKeywords('Mesh, mesh\nDead zone; weak wifi,,')).toEqual([
      'Mesh',
      'Dead zone',
      'weak wifi',
    ]);
  });
});

describe('AI generated cards', () => {
  const payload = {
    model: 'sfdc_ai__DefaultBedrockAnthropicClaude46Sonnet',
    rationale: 'Gamers ask about lag.',
    draft: {
      name: 'Orbit Pro gamer offer',
      type: 'Offer',
      title: 'Stop the lag',
      body: '- Wi-Fi 7',
      productId: '01t000000000003',
      productName: 'Orbit Pro',
      primary: {
        type: 'Open_URL',
        label: 'Shop Orbit Pro',
        value: 'https://acme.example/products/orbit-pro',
      },
      secondary: { type: 'Teleport', label: 'Nope', value: 'x' },
      keywords: ['gaming lag', 42, 'Gaming Lag', 'reduce ping'],
      matchOn: 'Both',
      priority: 140,
    },
  };

  it('parses the Apex draft defensively', () => {
    const generated = parseGenerated(payload);
    expect(generated?.draft.type).toBe('Offer');
    expect(generated?.draft.secondary.type).toBeNull();
    expect(generated?.draft.keywords).toEqual(['gaming lag', 'reduce ping']);
    expect(generated?.draft.priority).toBe(100);
    expect(generated?.draft.subtitle).toBe('');
    expect(
      parseGenerated({ draft: { type: 'Poster', title: 'x' } })
    ).toBeNull();
    expect(parseGenerated('nope')).toBeNull();
  });

  it('merges into the edited card but keeps its id, publishing state, and size', () => {
    const base: CardDraft = {
      ...emptyDraft('Product'),
      id: 'a01',
      active: false,
      lastModified: 'yesterday',
      title: 'Old',
      size: 'compact',
    };
    const generated = parseGenerated(payload);
    if (!generated) throw new Error('expected a card');
    const merged = mergeGenerated(base, generated);
    expect(merged).toMatchObject({
      id: 'a01',
      active: false,
      lastModified: 'yesterday',
      title: 'Stop the lag',
      type: 'Offer',
      size: 'compact',
    });
    expect(draftContent(merged)).not.toHaveProperty('id');
    expect(draftContent(merged)).not.toHaveProperty('size');
  });

  it('labels Models API names for people', () => {
    expect(modelLabel('sfdc_ai__DefaultBedrockAnthropicClaude46Sonnet')).toBe(
      'Claude Sonnet 4.6'
    );
    expect(modelLabel('sfdc_ai__DefaultBedrockAnthropicClaude5Opus')).toBe(
      'Claude Opus 5'
    );
    expect(modelLabel('sfdc_ai__DefaultGPT41Mini')).toBe('GPT41Mini');
  });
});

describe('carouselIds', () => {
  const v1 = (id: string, type: 'Product' | 'Offer' | 'Article') => ({
    ...toV1({ ...emptyDraft(type), title: id }),
    id,
  });

  it('puts two or more products and offers in the carousel', () => {
    expect([
      ...carouselIds([
        v1('p', 'Product'),
        v1('a', 'Article'),
        v1('o', 'Offer'),
      ]),
    ]).toEqual(['p', 'o']);
    expect(carouselIds([v1('p', 'Product'), v1('a', 'Article')]).size).toBe(0);
  });
});

describe('parseDisplaySettings', () => {
  it('accepts the settings route reply and clamps the card count', () => {
    expect(parseDisplaySettings({ cardSize: 'compact', maxCards: 9 })).toEqual({
      cardSize: 'compact',
      maxCards: 6,
    });
    expect(parseDisplaySettings({ cardSize: 'standard', maxCards: 3 })).toEqual(
      { cardSize: 'standard', maxCards: 3 }
    );
  });

  it('rejects unknown sizes and malformed replies', () => {
    expect(parseDisplaySettings({ cardSize: 'huge', maxCards: 3 })).toBeNull();
    expect(parseDisplaySettings({ cardSize: 'compact' })).toBeNull();
    expect(parseDisplaySettings(null)).toBeNull();
    expect(clampMaxCards(0)).toBe(1);
  });
});

describe('linkAction', () => {
  const article = (
    kind: 'open_url' | 'send_message' | 'launch_flow',
    value: string
  ) => ({
    ...toV1({ ...emptyDraft('Article'), title: 'Guide' }),
    actions: [{ role: 'primary' as const, kind, label: 'Read', value }],
  });

  it('shows articles that open a page or ask Fin as links', () => {
    expect(
      linkAction(article('open_url', 'https://example.com/support/a'))?.value
    ).toBe('https://example.com/support/a');
    expect(linkAction(article('send_message', 'Tell me more'))?.kind).toBe(
      'send_message'
    );
  });

  it('keeps flows, unsafe links, and other card types as full cards', () => {
    expect(
      linkAction(article('launch_flow', 'Fin_Request_Callback'))
    ).toBeNull();
    expect(linkAction(article('open_url', 'javascript:alert(1)'))).toBeNull();
    expect(
      linkAction({
        ...article('open_url', 'https://example.com'),
        type: 'self_service',
      })
    ).toBeNull();
  });
});

describe('image hosts', () => {
  const trusted = [
    'https://www.eatingwell.com',
    '*.salesforce.com',
    'https://*.imgur.com',
    'https://acme.test:443',
  ];

  it('reads the host of https images and skips site-relative ones', () => {
    expect(imageHost('https://WWW.EatingWell.com/thmb/a.jpg')).toBe(
      'www.eatingwell.com'
    );
    expect(imageHost('/images/products/orbit-7-640.jpg')).toBeNull();
    expect(imageHost('http://example.com/a.jpg')).toBeNull();
  });

  it('matches exact hosts, ports, and wildcard subdomains', () => {
    expect(trustsImageHost(trusted, 'www.eatingwell.com')).toBe(true);
    expect(trustsImageHost(trusted, 'eatingwell.com')).toBe(false);
    expect(trustsImageHost(trusted, 'i.imgur.com')).toBe(true);
    expect(trustsImageHost(trusted, 'imgur.com')).toBe(false);
    expect(trustsImageHost(trusted, 'org.my.salesforce.com')).toBe(true);
    expect(trustsImageHost(trusted, 'acme.test')).toBe(true);
    expect(trustsImageHost(trusted, 'evil-salesforce.com')).toBe(false);
  });

  it('names trusted image sites with a valid, bounded API name', () => {
    expect(trustedSiteName('www.eatingwell.com')).toBe(
      'Fin_Img_www_eatingwell_com'
    );
    expect(trustedSiteName('cdn--images.example.co.uk')).toBe(
      'Fin_Img_cdn_images_example_co_uk'
    );
    const long = trustedSiteName(`${'a'.repeat(70)}.b-c.example.com`);
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^[A-Za-z](?!.*__)[A-Za-z0-9_]*[A-Za-z0-9]$/);
  });
});
