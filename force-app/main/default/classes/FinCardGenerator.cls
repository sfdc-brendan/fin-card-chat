/**
 * Drafts a Fin UI Card from a short brief with the Models API, grounded in active products, existing cards, and the
 * optional sample catalog's site pages. Returns an unsaved draft in the Fin Card Studio shape; every field is
 * validated here, so the model cannot introduce off-site links, unknown flows, or products that do not exist.
 */
public with sharing class FinCardGenerator {
    public static final String DEFAULT_MODEL = 'sfdc_ai__DefaultBedrockAnthropicClaude46Sonnet';
    public static final Set<String> FLOWS = new Set<String>{ 'Fin_Request_Callback' };
    private static final Set<String> TYPES = new Set<String>{ 'Product', 'Offer', 'Article', 'Self_Service' };
    private static final Set<String> ACTIONS = new Set<String>{ 'Open_URL', 'Send_Message', 'Launch_Flow' };
    private static final Set<String> SCOPES = new Set<String>{ 'Both', 'User_Message', 'Fin_Reply' };
    private static final String PRODUCT_IMAGE_FIELD = 'Image_URL__c';
    private static final Integer MAX_KEYWORDS = 10;
    private static final Integer MAX_BRIEF = 2000;

    public class GeneratorException extends Exception {
    }

    public interface Model {
        String complete(String modelName, String systemPrompt, String userPrompt);
    }

    @TestVisible
    private static Model model = new ModelsApiModel();

    private class ModelsApiModel implements Model {
        public String complete(String modelName, String systemPrompt, String userPrompt) {
            aiplatform.ModelsAPI.createChatGenerations_Request request = new aiplatform.ModelsAPI.createChatGenerations_Request();
            request.modelName = modelName;
            aiplatform.ModelsAPI_ChatGenerationsRequest body = new aiplatform.ModelsAPI_ChatGenerationsRequest();
            body.messages = new List<aiplatform.ModelsAPI_ChatMessageRequest>{ message('system', systemPrompt), message('user', userPrompt) };
            request.body = body;
            try {
                aiplatform.ModelsAPI.createChatGenerations_Response response = new aiplatform.ModelsAPI().createChatGenerations(request);
                return response.Code200.generationDetails.generations[0].content;
            } catch (aiplatform.ModelsAPI.createChatGenerations_ResponseException e) {
                throw new GeneratorException('The Models API could not draft a card (HTTP ' + e.responseCode + '). Check that Einstein generative AI is on and the model ' + modelName + ' is available.');
            }
        }

        private aiplatform.ModelsAPI_ChatMessageRequest message(String role, String content) {
            aiplatform.ModelsAPI_ChatMessageRequest m = new aiplatform.ModelsAPI_ChatMessageRequest();
            m.role = role;
            m.content = content;
            return m;
        }
    }

    public static String modelName() {
        String configured = Fin_Agent_Settings__c.getOrgDefaults()?.Card_Model__c;
        return String.isBlank(configured) ? DEFAULT_MODEL : configured.trim();
    }

    /**
     * body: {brief, type?, productId?, current?: draft, instruction?}
     * Returns {draft, rationale, model}.
     */
    public static Map<String, Object> generate(Map<String, Object> body) {
        String brief = text(body.get('brief'), MAX_BRIEF);
        String instruction = text(body.get('instruction'), MAX_BRIEF);
        Map<String, Object> current = body.get('current') instanceof Map<String, Object> ? (Map<String, Object>) body.get('current') : null;
        if (brief == '' && (current == null || instruction == '')) {
            throw new GeneratorException('Describe the card you want, or give an instruction to refine the current card.');
        }
        String requestedType = TYPES.contains(String.valueOf(body.get('type'))) ? String.valueOf(body.get('type')) : null;

        Map<Id, Map<String, Object>> products = products();
        Id productId = idOrNull(body.get('productId'));
        Map<String, Object> request = new Map<String, Object>{
            'brief' => brief,
            'cardType' => requestedType == null ? 'choose the best fit' : requestedType,
            'product' => productId == null ? null : products.get(productId),
            'currentCard' => current,
            'instruction' => instruction
        };
        Map<String, Object> context = new Map<String, Object>{
            'brand' => FinCardCatalog.brandName(),
            'brandDescription' => FinCardCatalog.brandDescription(),
            'site' => FinCardCatalog.site(),
            'products' => products.values(),
            'pages' => FinCardCatalog.pages(),
            'sitePages' => FinCardCatalog.sitePages(),
            'flows' => new List<String>(FLOWS),
            'styleExamples' => examples(requestedType)
        };
        String userPrompt = 'CONTEXT:\n' + JSON.serialize(context, true) + '\n\nREQUEST:\n' + JSON.serialize(request, true);

        String name = modelName();
        Map<String, Object> raw = parse(model.complete(name, systemPrompt(), userPrompt));
        if (raw.get('productId') == null && productId != null) {
            raw.put('productId', productId);
        }
        Map<String, Object> draft = toDraft(raw, products, requestedType);
        return new Map<String, Object>{ 'draft' => draft, 'rationale' => text(raw.get('rationale'), 400), 'model' => name };
    }

    private static String systemPrompt() {
        return String.join(
            new List<String>{
                'You design UI cards that appear under Fin\'s answers in the CONTEXT.brand "Ask Fin" chat on an Experience Cloud site.',
                'CONTEXT.brandDescription, when set, describes the company. Products, prices, and pages come only from CONTEXT.',
                'Respond with one JSON object only, no prose and no code fences, with exactly these keys:',
                '{"name": string, "type": "Product"|"Offer"|"Article"|"Self_Service", "title": string, "subtitle": string, "body": string,',
                ' "productId": string|null, "imageUrl": string, "priceLabel": string, "badge": string,',
                ' "primary": {"type": "Open_URL"|"Send_Message"|"Launch_Flow", "label": string, "value": string},',
                ' "secondary": {"type": ..., "label": string, "value": string} | null,',
                ' "keywords": string[], "matchOn": "Both"|"User_Message"|"Fin_Reply", "sourceUrlContains": string, "priority": integer, "rationale": string}',
                'Card types: Product = one catalog product; Offer = a plan, bundle, or promotion; Article = a support guide; Self_Service = an action the visitor can take now.',
                'Facts: use only facts in CONTEXT. Never invent prices, speeds, specs, policies, timelines, or guarantees. Leave priceLabel empty unless CONTEXT gives the price.',
                'If REQUEST.product is set, build the card around it, use its id as productId, its imageUrl, and its price (for example "$229 / 2-pack" or "From $1,299").',
                'Links: Open_URL values must be a CONTEXT.pages url, or CONTEXT.site followed by one of CONTEXT.sitePages or /products/<slug>. Never link anywhere else. If CONTEXT.site is null, use only Send_Message and Launch_Flow actions.',
                'Send_Message value is the exact first-person question the visitor sends to Fin when they tap the button. Launch_Flow value must be one of CONTEXT.flows.',
                'Products and offers: primary Open_URL to the product or plan page, secondary Send_Message. Articles: primary Open_URL to the guide. Self-service: lead with the action.',
                'Copy: the voice is warm, plain, and confident. Sentence case. title <= 60 chars, subtitle <= 90, badge <= 24 (2 or 3 words), labels <= 28 and start with a verb.',
                'body: optional one-sentence intro line, then 2 to 4 lines that start with "- ". Each bullet under 70 characters. No markdown other than "- ".',
                'Every bullet must restate a fact from CONTEXT (a product description, price, page title, or style example). Do not add features, services, or management capabilities CONTEXT does not mention.',
                'keywords: 4 to 8 lowercase phrases a visitor would literally type, no punctuation, specific to this card. Avoid lone generic words like "help", "internet", or "wifi".',
                'matchOn: Article and Self_Service use "User_Message"; Product and Offer use "Both".',
                'sourceUrlContains: the most specific matching slug from CONTEXT.pages, otherwise "". A card about one product or plan uses that page (for example "product-<slug>" or "plan-<slug>"), not a comparison or overview guide.',
                'priority (1 to 100, higher shows first): self-service 75 to 90, urgent troubleshooting guides 50 to 65, offers 54 to 62, products 50, informational guides 35 to 48.',
                'name: an internal label such as "<title> guide" or "<product> holiday offer". rationale: one sentence on why these triggers and actions fit.',
                'If REQUEST.currentCard is set, revise that card according to REQUEST.instruction and keep everything the instruction does not ask to change.',
                'Match the tone and structure of CONTEXT.styleExamples.'
            },
            '\n'
        );
    }

    // Product2.Image_URL__c is optional (many demo orgs have it); the query only selects it when it exists.
    private static Map<Id, Map<String, Object>> products() {
        Boolean hasImage = Schema.SObjectType.Product2.fields.getMap().containsKey(PRODUCT_IMAGE_FIELD.toLowerCase());
        String query =
            'SELECT Id, Name, Family, Description' + (hasImage ? ', ' + PRODUCT_IMAGE_FIELD : '') +
            ', (SELECT UnitPrice FROM PricebookEntries WHERE IsActive = TRUE AND Pricebook2.IsStandard = TRUE LIMIT 1)' +
            ' FROM Product2 WHERE IsActive = TRUE ORDER BY Name LIMIT 60';
        Map<Id, Map<String, Object>> products = new Map<Id, Map<String, Object>>();
        for (Product2 p : (List<Product2>) Database.query(query, AccessLevel.USER_MODE)) {
            String image = hasImage ? (String) p.get(PRODUCT_IMAGE_FIELD) : null;
            products.put(p.Id, new Map<String, Object>{
                'id' => p.Id,
                'name' => p.Name,
                'family' => p.Family,
                'description' => p.Description == null ? null : p.Description.left(500),
                'imageUrl' => String.isNotBlank(image) ? image : FinCardCatalog.productImage(p.Name),
                'unitPrice' => p.PricebookEntries.isEmpty() ? null : p.PricebookEntries[0].UnitPrice
            });
        }
        return products;
    }

    private static List<Map<String, Object>> examples(String type) {
        List<Map<String, Object>> examples = new List<Map<String, Object>>();
        String query =
            'SELECT Type__c, Title__c, Subtitle__c, Body__c, Badge__c, Price_Label__c, Trigger_Keywords__c, Primary_Action_Label__c, Secondary_Action_Label__c ' +
            'FROM Fin_UI_Card__c WHERE Active__c = TRUE' + (type == null ? '' : ' AND Type__c = :type') +
            ' ORDER BY Priority__c DESC NULLS LAST LIMIT 4';
        for (Fin_UI_Card__c c : (List<Fin_UI_Card__c>) Database.queryWithBinds(query, new Map<String, Object>{ 'type' => type }, AccessLevel.USER_MODE)) {
            examples.add(new Map<String, Object>{
                'type' => c.Type__c,
                'title' => c.Title__c,
                'subtitle' => c.Subtitle__c,
                'body' => c.Body__c,
                'badge' => c.Badge__c,
                'priceLabel' => c.Price_Label__c,
                'keywords' => c.Trigger_Keywords__c,
                'actionLabels' => new List<String>{ c.Primary_Action_Label__c, c.Secondary_Action_Label__c }
            });
        }
        return examples;
    }

    @TestVisible
    private static Map<String, Object> parse(String content) {
        String raw = content == null ? '' : content;
        Integer start = raw.indexOf('{');
        Integer finish = raw.lastIndexOf('}');
        if (start < 0 || finish <= start) {
            throw new GeneratorException('The model did not return a card. Try rephrasing the brief.');
        }
        try {
            return (Map<String, Object>) JSON.deserializeUntyped(raw.substring(start, finish + 1));
        } catch (Exception e) {
            throw new GeneratorException('The model returned a card the studio could not read. Try again.');
        }
    }

    @TestVisible
    private static Map<String, Object> toDraft(Map<String, Object> raw, Map<Id, Map<String, Object>> products, String requestedType) {
        String type = requestedType != null ? requestedType : (TYPES.contains(String.valueOf(raw.get('type'))) ? String.valueOf(raw.get('type')) : 'Product');
        Id productId = idOrNull(raw.get('productId'));
        Map<String, Object> product = productId == null ? null : products.get(productId);
        if (product == null) {
            productId = null;
        }
        String imageUrl = siteUrl(raw.get('imageUrl'));
        if (imageUrl == null && product != null) {
            imageUrl = (String) product.get('imageUrl');
        }
        Boolean showcase = type == 'Product' || type == 'Offer';
        String matchOn = SCOPES.contains(String.valueOf(raw.get('matchOn'))) ? String.valueOf(raw.get('matchOn')) : (showcase ? 'Both' : 'User_Message');
        Map<String, Object> primary = action(raw.get('primary'));
        Map<String, Object> secondary = action(raw.get('secondary'));
        if (primary.get('type') == null && secondary.get('type') != null) {
            primary = secondary;
            secondary = action(null);
        }
        String title = text(raw.get('title'), 80);
        return new Map<String, Object>{
            'name' => text(raw.get('name'), 80) == '' ? title : text(raw.get('name'), 80),
            'type' => type,
            'title' => title,
            'subtitle' => text(raw.get('subtitle'), 120),
            'body' => text(raw.get('body'), 2000),
            'imageUrl' => showcase && imageUrl != null ? imageUrl : '',
            'productId' => productId,
            'productName' => product == null ? null : product.get('name'),
            'priceLabel' => showcase ? text(raw.get('priceLabel'), 40) : '',
            'badge' => text(raw.get('badge'), 30),
            'primary' => primary,
            'secondary' => secondary,
            'keywords' => keywords(raw.get('keywords')),
            'matchOn' => matchOn,
            'sourceUrlContains' => text(raw.get('sourceUrlContains'), 255).toLowerCase(),
            'priority' => priority(raw.get('priority'))
        };
    }

    private static Map<String, Object> action(Object value) {
        Map<String, Object> empty = new Map<String, Object>{ 'type' => null, 'label' => '', 'value' => '' };
        if (!(value instanceof Map<String, Object>)) {
            return empty;
        }
        Map<String, Object> raw = (Map<String, Object>) value;
        String type = String.valueOf(raw.get('type'));
        String label = text(raw.get('label'), 40);
        String target = text(raw.get('value'), 255);
        if (!ACTIONS.contains(type) || label == '') {
            return empty;
        }
        if (type == 'Open_URL') {
            target = siteUrl(target);
        } else if (type == 'Launch_Flow') {
            target = FLOWS.contains(target) ? target : null;
        } else if (target == '') {
            target = label;
        }
        if (target == null) {
            return empty;
        }
        return new Map<String, Object>{ 'type' => type, 'label' => label, 'value' => target };
    }

    // Only absolute links on the configured site survive; the model cannot point a card anywhere else.
    @TestVisible
    private static String siteUrl(Object value) {
        String site = FinCardCatalog.site();
        if (site == null) {
            return null;
        }
        String url = value == null ? '' : String.valueOf(value).trim();
        if (url.startsWith('/') && !url.startsWith('//')) {
            url = site + url;
        }
        if (url.length() > 255 || !(url == site || url.startsWith(site + '/'))) {
            return null;
        }
        return url;
    }

    private static List<String> keywords(Object value) {
        List<String> phrases = new List<String>();
        Set<String> seen = new Set<String>();
        if (!(value instanceof List<Object>)) {
            return phrases;
        }
        for (Object item : (List<Object>) value) {
            String phrase = FinCardMatcher.normalize(String.valueOf(item)).trim().left(60);
            if (phrase != '' && !seen.contains(phrase) && phrases.size() < MAX_KEYWORDS) {
                seen.add(phrase);
                phrases.add(phrase);
            }
        }
        return phrases;
    }

    private static Integer priority(Object value) {
        Decimal parsed;
        try {
            parsed = value == null ? null : Decimal.valueOf(String.valueOf(value));
        } catch (TypeException e) {
            parsed = null;
        }
        return parsed == null ? 50 : Math.min(100, Math.max(1, parsed.intValue()));
    }

    private static String text(Object value, Integer max) {
        return value == null ? '' : String.valueOf(value).trim().left(max);
    }

    private static Id idOrNull(Object value) {
        try {
            return value == null || String.valueOf(value) == '' ? null : Id.valueOf(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }
}
